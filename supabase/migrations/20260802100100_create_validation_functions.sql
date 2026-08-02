-- Validation functions and triggers.
--
-- None of these three rules belongs in a CHECK constraint, for three different
-- reasons. A CHECK condition is assumed to keep holding for the life of a row:
-- Postgres evaluates it on write and never revisits it, so a condition whose
-- truth depends on anything outside the row is the wrong tool.
--
--   * timezone validity     -> requires a catalog lookup, and a CHECK condition
--                              cannot query another relation
--   * future check-in dates -> time-dependent. A row valid when written would
--                              silently stay "valid" as the definition of today
--                              moved underneath it
--   * updated_at            -> must mutate the row, which a constraint cannot
--                              do at all; constraints accept or reject, never
--                              rewrite
--
-- All three are SECURITY INVOKER. None needs elevated privilege, and reaching
-- for SECURITY DEFINER to make a permission error disappear is exactly the
-- pattern that silently removes access control.
--
-- All three set search_path = '' and schema-qualify every reference, so they
-- cannot be captured by a search_path the caller controls.

-- ---------------------------------------------------------------------------
-- set_updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger. Maintains updated_at on the tables that carry it.';

-- ---------------------------------------------------------------------------
-- validate_timezone
-- ---------------------------------------------------------------------------

create or replace function public.validate_timezone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = new.timezone
  ) then
    raise exception 'invalid timezone: %', new.timezone
      using errcode = '22023';
  end if;

  return new;
end;
$$;

comment on function public.validate_timezone() is
  'BEFORE INSERT OR UPDATE trigger. Rejects any timezone absent from pg_timezone_names.';

-- ---------------------------------------------------------------------------
-- validate_check_in_date
-- ---------------------------------------------------------------------------
-- Rejects a check-in dated after the owner's own local today. Backdating is
-- allowed: a user catching up on yesterday is legitimate.
--
-- The timezone is read from the row owner's profile. Under SECURITY INVOKER the
-- caller can only read their own profile, which is exactly the row needed,
-- because the check_ins policies already force user_id = auth.uid().

create or replace function public.validate_check_in_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_timezone text;
  local_today date;
begin
  select p.timezone
    into owner_timezone
  from public.profiles p
  where p.id = new.user_id;

  -- No fallback. profiles.timezone is NOT NULL, so a null here means the
  -- profile row could not be read at all, and the correct local date is
  -- therefore unknown.
  --
  -- Substituting UTC would be a guess presented as a fact. UTC is not a safe
  -- default in either direction: it is behind every zone from Asia/Kolkata
  -- (+05:30) through Pacific/Kiritimati (+14:00), so a genuine check-in made
  -- "today" in Mumbai would be rejected as being in the future. Failing
  -- loudly is the only honest option.
  if owner_timezone is null then
    raise exception
      'cannot validate check_in_date: no readable profile timezone for user %',
      new.user_id
      using errcode = '22023';
  end if;

  local_today := (pg_catalog.now() at time zone owner_timezone)::date;

  if new.check_in_date > local_today then
    raise exception
      'check_in_date % is in the future (local date % in timezone %)',
      new.check_in_date, local_today, owner_timezone
      using errcode = '22023';
  end if;

  return new;
end;
$$;

comment on function public.validate_check_in_date() is
  'BEFORE INSERT OR UPDATE trigger. Rejects check_in_date after the owner''s local today.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- updated_at only where a row is genuinely revised. goal_actions is omitted:
-- its only meaningful mutation is completed_at, which already records when.

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger goals_set_updated_at
  before update on public.goals
  for each row
  execute function public.set_updated_at();

create trigger check_ins_set_updated_at
  before update on public.check_ins
  for each row
  execute function public.set_updated_at();

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row
  execute function public.validate_timezone();

create trigger check_ins_validate_date
  before insert or update of check_in_date on public.check_ins
  for each row
  execute function public.validate_check_in_date();

-- ---------------------------------------------------------------------------
-- Privilege hardening
-- ---------------------------------------------------------------------------
-- Postgres grants EXECUTE to PUBLIC on every new function, which would make
-- these callable directly by anon and authenticated.
--
-- Revoking is safe for trigger functions: EXECUTE is checked when the trigger
-- is created, not when it fires. The triggers above continue to work.

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.validate_timezone() from public, anon, authenticated;
revoke all on function public.validate_check_in_date() from public, anon, authenticated;
