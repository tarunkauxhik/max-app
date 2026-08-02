-- MAX core schema: profiles, goals, goal_actions, check_ins.
--
-- Scope is deliberately four tables. Squads, social, images, AI, notifications,
-- analytics and payments are out of scope and have no placeholders here.
--
-- RLS is enabled at the end of this migration, before any policy exists.
-- Enabled RLS with zero policies denies everything, so these tables are
-- fail-closed from the moment they are created rather than from whenever
-- migration 3 lands.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per auth user. Only auth.users(id) is referenced: Supabase guarantees
-- primary keys of its managed schemas, but explicitly warns that other columns,
-- indexes and constraints may change at any time.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  display_name text,
  bio text,

  -- IANA name. Validated against pg_timezone_names by trigger in migration 2:
  -- the rule requires a catalog lookup, and a CHECK condition cannot query
  -- another relation.
  timezone text not null default 'UTC',

  -- Onboarding answers. An array is the minimal shape while nothing aggregates
  -- interests across users.
  interests text[] not null default '{}',
  commitment text,
  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length
    check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 280),
  constraint profiles_timezone_not_blank
    check (char_length(btrim(timezone)) > 0),
  constraint profiles_interests_max_three
    check (cardinality(interests) <= 3),
  constraint profiles_interests_allowed
    check (interests <@ array['fitness', 'learning', 'career', 'wellbeing', 'creative', 'finance']::text[]),
  constraint profiles_commitment_allowed
    check (commitment is null or commitment in ('light', 'regular', 'serious'))
);

comment on table public.profiles is
  'Per-user profile, 1:1 with auth.users. Created by handle_new_user on signup.';
comment on column public.profiles.timezone is
  'IANA timezone name. Anchors the local day boundary used by streaks and check-ins.';

-- No index beyond the primary key: profiles is only ever fetched by id.

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,

  title text not null,
  minutes_per_day smallint not null,
  duration_weeks smallint not null,
  difficulty text not null,

  status text not null default 'active',

  -- Anchors "week N of M", which is derived rather than stored.
  --
  -- No default. current_date is the server's date, which is not the user's
  -- calendar date: a user in Asia/Kolkata creating a goal at 02:00 local would
  -- have it dated to the previous day. The caller must supply the local date it
  -- already knows, from profiles.timezone.
  start_date date not null,

  completed_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Sole purpose is to be the target of the child tables' composite foreign
  -- keys. Redundant with the primary key, and that is the intended cost.
  constraint goals_id_user_id_key unique (id, user_id),

  constraint goals_title_length
    check (char_length(btrim(title)) between 3 and 60),

  -- A range, not the five values the UI currently offers. Chip values are a UI
  -- decision; the database invariant is "a sane daily duration". Encoding the
  -- chips here would make every UI tweak a migration.
  constraint goals_minutes_per_day_range
    check (minutes_per_day between 5 and 480),
  constraint goals_duration_weeks_range
    check (duration_weeks between 1 and 52),

  constraint goals_difficulty_allowed
    check (difficulty in ('gentle', 'steady', 'intense')),
  constraint goals_status_allowed
    check (status in ('active', 'completed', 'archived')),

  -- One invariant covering the whole lifecycle, rather than two rules that only
  -- happen to agree.
  --
  -- The asymmetry is deliberate: an archived goal MAY retain completed_at,
  -- because finishing a goal and later filing it away are different events and
  -- archiving must not erase the fact that it was completed. A previous pair of
  -- biconditional constraints made that legitimate state impossible.
  constraint goals_status_timestamps
    check (
      case status
        when 'active' then completed_at is null and archived_at is null
        when 'completed' then completed_at is not null and archived_at is null
        when 'archived' then archived_at is not null
        else false
      end
    )
);

comment on table public.goals is
  'A user goal. Deletion is archival (status = archived); rows are removed only when the account is.';

-- Serves "my active goals, newest first" and the RLS ownership predicate.
-- user_id leads, so this also covers the foreign key to profiles.
create index goals_user_id_status_created_at_idx
  on public.goals (user_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- goal_actions
-- ---------------------------------------------------------------------------
-- One action, on one date, for one goal. Dated rows rather than a recurring
-- template: a template forces every day to look identical, which AI planning
-- will need to break immediately.

create table public.goal_actions (
  id uuid primary key default gen_random_uuid(),

  goal_id uuid not null,
  -- Denormalised so RLS never sub-queries the parent. The composite foreign key
  -- below makes drift impossible rather than merely unlikely.
  user_id uuid not null,

  scheduled_date date not null,
  position smallint not null,

  title text not null,
  note text,

  -- null means not done. A separate boolean would be a second source of truth
  -- for the same fact.
  completed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint goal_actions_goal_fkey
    foreign key (goal_id, user_id)
    references public.goals (id, user_id)
    on delete cascade,

  -- Prevents duplicate scheduled actions.
  constraint goal_actions_goal_date_position_key
    unique (goal_id, scheduled_date, position),

  constraint goal_actions_position_range
    check (position between 1 and 20),
  constraint goal_actions_title_length
    check (char_length(btrim(title)) between 1 and 120),
  constraint goal_actions_note_length
    check (note is null or char_length(note) <= 280)
);

comment on table public.goal_actions is
  'One dated action for a goal. completed_at null means outstanding.';
comment on constraint goal_actions_goal_fkey on public.goal_actions is
  'Composite FK: an action cannot reference a goal owned by a different user.';

-- Serves "my actions for a given day" across goals, and the RLS predicate.
-- goal_id is already the leftmost column of goal_actions_goal_date_position_key,
-- so no separate foreign-key index is needed.
create index goal_actions_user_id_scheduled_date_idx
  on public.goal_actions (user_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- check_ins
-- ---------------------------------------------------------------------------

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),

  goal_id uuid not null,
  user_id uuid not null,

  -- The local calendar day being checked in for, in the user's own timezone.
  -- A future date is rejected by trigger in migration 2: the comparison is
  -- time-dependent, and a CHECK condition is assumed to hold for the life of
  -- the row rather than to be re-evaluated as the clock moves.
  check_in_date date not null,

  -- Nullable: PRODUCT.md calls for text-first check-ins, but the current Today
  -- screen captures no text. Nullable keeps both readings alive until the UI
  -- gap is closed.
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_ins_goal_fkey
    foreign key (goal_id, user_id)
    references public.goals (id, user_id)
    on delete cascade,

  -- Prevents duplicate daily check-ins.
  constraint check_ins_goal_date_key
    unique (goal_id, check_in_date),

  constraint check_ins_note_length
    check (note is null or char_length(note) <= 2000)
);

comment on table public.check_ins is
  'One check-in per goal per local day. Streaks are derived from these rows, never stored.';

create index check_ins_user_id_check_in_date_idx
  on public.check_ins (user_id, check_in_date desc);

-- ---------------------------------------------------------------------------
-- Fail closed
-- ---------------------------------------------------------------------------
-- Enabled here, with no policies yet, so nothing is reachable between this
-- migration and the policies in 20260802100200. Policies are additive: until
-- one exists, every row is denied.

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.goal_actions enable row level security;
alter table public.check_ins enable row level security;
