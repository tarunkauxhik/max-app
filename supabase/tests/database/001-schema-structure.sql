-- Structural assertions: the objects the design promised actually exist.
--
-- These catch a migration that was edited into a different shape than the one
-- reviewed. Behaviour is tested in 003 onwards; this file only checks presence.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(52);

-- ---------------------------------------------------------------------------
-- Tables (4)
-- ---------------------------------------------------------------------------
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'goals', 'goals exists');
select has_table('public', 'goal_actions', 'goal_actions exists');
select has_table('public', 'check_ins', 'check_ins exists');

-- ---------------------------------------------------------------------------
-- Primary keys (4)
-- ---------------------------------------------------------------------------
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select col_is_pk('public', 'goals', 'id', 'goals.id is the primary key');
select col_is_pk('public', 'goal_actions', 'id', 'goal_actions.id is the primary key');
select col_is_pk('public', 'check_ins', 'id', 'check_ins.id is the primary key');

-- ---------------------------------------------------------------------------
-- Ownership columns are NOT NULL (5)
-- ---------------------------------------------------------------------------
-- A nullable ownership column would make (select auth.uid()) = user_id
-- evaluate to NULL rather than false, which is not a denial anyone should rely
-- on reading correctly.
select col_not_null('public', 'goals', 'user_id', 'goals.user_id is not null');
select col_not_null('public', 'goal_actions', 'user_id', 'goal_actions.user_id is not null');
select col_not_null('public', 'goal_actions', 'goal_id', 'goal_actions.goal_id is not null');
select col_not_null('public', 'check_ins', 'user_id', 'check_ins.user_id is not null');
select col_not_null('public', 'check_ins', 'goal_id', 'check_ins.goal_id is not null');

-- ---------------------------------------------------------------------------
-- Column types (10)
-- ---------------------------------------------------------------------------
select col_type_is('public', 'profiles', 'id', 'uuid', 'profiles.id is uuid');
select col_type_is('public', 'profiles', 'timezone', 'text', 'profiles.timezone is text');
select col_type_is('public', 'profiles', 'interests', 'text[]', 'profiles.interests is text[]');
select col_type_is('public', 'profiles', 'created_at', 'timestamp with time zone',
  'instants are timestamptz');
select col_type_is('public', 'goals', 'start_date', 'date',
  'calendar days are date, not timestamptz');
select col_type_is('public', 'goals', 'minutes_per_day', 'smallint',
  'small bounded integers are smallint');
select col_type_is('public', 'goal_actions', 'scheduled_date', 'date',
  'goal_actions.scheduled_date is date');
select col_type_is('public', 'goal_actions', 'completed_at', 'timestamp with time zone',
  'goal_actions.completed_at is timestamptz');
select col_type_is('public', 'check_ins', 'check_in_date', 'date',
  'check_ins.check_in_date is date');
select col_type_is('public', 'check_ins', 'updated_at', 'timestamp with time zone',
  'check_ins.updated_at is timestamptz');

-- ---------------------------------------------------------------------------
-- Foreign keys and the composite ownership guarantee (4)
-- ---------------------------------------------------------------------------
select fk_ok('public', 'profiles', 'id', 'auth', 'users', 'id',
  'profiles.id references auth.users(id)');
select fk_ok('public', 'goals', 'user_id', 'public', 'profiles', 'id',
  'goals.user_id references profiles.id');
select fk_ok(
  'public', 'goal_actions', array['goal_id', 'user_id'],
  'public', 'goals', array['id', 'user_id'],
  'goal_actions uses a composite FK to goals(id, user_id)');
select fk_ok(
  'public', 'check_ins', array['goal_id', 'user_id'],
  'public', 'goals', array['id', 'user_id'],
  'check_ins uses a composite FK to goals(id, user_id)');

-- ---------------------------------------------------------------------------
-- ON DELETE CASCADE (4)
-- ---------------------------------------------------------------------------
-- Account deletion depends entirely on this chain. Cascades are not subject to
-- RLS, which is what makes them a complete deletion path.
select is(
  (select confdeltype from pg_catalog.pg_constraint where conname = 'profiles_id_fkey'),
  'c'::"char", 'profiles -> auth.users cascades on delete');
select is(
  (select confdeltype from pg_catalog.pg_constraint where conname = 'goals_user_id_fkey'),
  'c'::"char", 'goals -> profiles cascades on delete');
select is(
  (select confdeltype from pg_catalog.pg_constraint where conname = 'goal_actions_goal_fkey'),
  'c'::"char", 'goal_actions -> goals cascades on delete');
select is(
  (select confdeltype from pg_catalog.pg_constraint where conname = 'check_ins_goal_fkey'),
  'c'::"char", 'check_ins -> goals cascades on delete');

-- ---------------------------------------------------------------------------
-- Unique constraints (3)
-- ---------------------------------------------------------------------------
select col_is_unique('public', 'goals', array['id', 'user_id'],
  'goals(id, user_id) is unique so it can anchor the composite FKs');
select col_is_unique('public', 'goal_actions', array['goal_id', 'scheduled_date', 'position'],
  'a goal cannot have two actions in the same slot on the same day');
select col_is_unique('public', 'check_ins', array['goal_id', 'check_in_date'],
  'a goal cannot be checked in twice on the same day');

-- ---------------------------------------------------------------------------
-- Indexes (3)
-- ---------------------------------------------------------------------------
-- Only the three deliberate composite indexes. Every FK column is already a
-- leftmost prefix of one of these or of a unique constraint.
select has_index('public', 'goals', 'goals_user_id_status_created_at_idx',
  'goals has its ownership/status/recency index');
select has_index('public', 'goal_actions', 'goal_actions_user_id_scheduled_date_idx',
  'goal_actions has its ownership/date index');
select has_index('public', 'check_ins', 'check_ins_user_id_check_in_date_idx',
  'check_ins has its ownership/date index');

-- ---------------------------------------------------------------------------
-- CHECK constraints and defaults (7)
-- ---------------------------------------------------------------------------
select has_check('public', 'profiles', 'profiles has CHECK constraints');
select has_check('public', 'goals', 'goals has CHECK constraints');
select has_check('public', 'goal_actions', 'goal_actions has CHECK constraints');
select has_check('public', 'check_ins', 'check_ins has CHECK constraints');

-- One lifecycle invariant, not two rules that only happen to agree.
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'goals_status_timestamps'
  ),
  'goals has a single status/timestamp lifecycle invariant');

-- The superseded pair must be gone. Leaving either behind would forbid an
-- archived goal from retaining completed_at, which is a legitimate state.
select ok(
  not exists (
    select 1 from pg_catalog.pg_constraint
    where conname in ('goals_completed_at_consistent', 'goals_archived_at_consistent')
  ),
  'the superseded biconditional constraints are gone');

-- start_date must have no default: the caller supplies the user's local date.
select col_hasnt_default('public', 'goals', 'start_date',
  'goals.start_date has no default, so the server date cannot be assumed');

-- ---------------------------------------------------------------------------
-- Functions and triggers (8)
-- ---------------------------------------------------------------------------
select has_function('public', 'set_updated_at', 'set_updated_at exists');
select has_function('public', 'validate_timezone', 'validate_timezone exists');
select has_function('public', 'validate_check_in_date', 'validate_check_in_date exists');
select has_function('public', 'handle_new_user', 'handle_new_user exists');

select has_trigger('public', 'profiles', 'profiles_validate_timezone',
  'profiles validates its timezone');
select has_trigger('public', 'check_ins', 'check_ins_validate_date',
  'check_ins validates its date');
select has_trigger('public', 'goals', 'goals_set_updated_at',
  'goals maintains updated_at');
select ok(
  not exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    where c.relname = 'goal_actions'
      and t.tgname = 'goal_actions_set_updated_at'
  ),
  'goal_actions deliberately has no updated_at trigger');

select * from finish();
rollback;
