-- Fix: the column-level grants in 20260802100200 were inert.
--
-- WHAT WENT WRONG
--
-- Supabase ships ALTER DEFAULT PRIVILEGES on the public schema granting ALL to
-- anon, authenticated and service_role for every newly created table. Migration
-- 20260802100200 revoked from `public, anon` but not from `authenticated`, so
-- that default grant survived and the careful column lists that followed only
-- ADDED to a privilege set that was already complete.
--
-- Verified on max-dev after applying: authenticated held DELETE, INSERT,
-- REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE on all four tables, and
-- UPDATE on all 37 columns rather than the 20 intended.
--
-- WHAT WAS AND WAS NOT AT RISK
--
-- RLS was never bypassed. Every policy still restricted rows to
-- (select auth.uid()) = user_id, so no user could read or alter another user's
-- data. The defect was scope within a user's OWN rows: they could delete a
-- profile or a goal, both of which the design forbids, and rewrite id, user_id,
-- created_at and updated_at. anon was correctly left with nothing.
--
-- WHY A NEW MIGRATION
--
-- 20260802100200 is already applied and recorded in the remote migration
-- history. Editing an applied migration makes the file and the database
-- disagree, and every later `db push` compares against history rather than
-- content, so the edit would never be applied. Corrections go forward.

-- ---------------------------------------------------------------------------
-- Reset to nothing, then re-grant precisely
-- ---------------------------------------------------------------------------
-- REVOKE ALL removes the inherited default in full, including the TRUNCATE,
-- REFERENCES and TRIGGER privileges that no client should ever hold.

revoke all on public.profiles from authenticated;
revoke all on public.goals from authenticated;
revoke all on public.goal_actions from authenticated;
revoke all on public.check_ins from authenticated;

-- Re-assert the anon revoke. It held, but this migration must be sufficient on
-- its own: a database restored from these files alone has to reach the same
-- state without depending on the previous migration having run correctly.
revoke all on public.profiles from public, anon;
revoke all on public.goals from public, anon;
revoke all on public.goal_actions from public, anon;
revoke all on public.check_ins from public, anon;

-- profiles -------------------------------------------------------------------
-- No DELETE: removing a profile while auth.users survives orphans the account.
grant select on public.profiles to authenticated;
grant update (
  display_name,
  bio,
  timezone,
  interests,
  commitment,
  onboarding_completed_at
) on public.profiles to authenticated;

-- goals ----------------------------------------------------------------------
-- No DELETE: deletion is archival. user_id is insertable but never updatable,
-- so ownership transfer fails on privilege before RLS is consulted.
grant select on public.goals to authenticated;
grant insert (
  user_id,
  title,
  minutes_per_day,
  duration_weeks,
  difficulty,
  start_date
) on public.goals to authenticated;
grant update (
  title,
  minutes_per_day,
  duration_weeks,
  difficulty,
  status,
  start_date,
  completed_at,
  archived_at
) on public.goals to authenticated;

-- goal_actions ---------------------------------------------------------------
grant select on public.goal_actions to authenticated;
grant insert (
  goal_id,
  user_id,
  scheduled_date,
  position,
  title,
  note
) on public.goal_actions to authenticated;
grant update (
  scheduled_date,
  position,
  title,
  note,
  completed_at
) on public.goal_actions to authenticated;
grant delete on public.goal_actions to authenticated;

-- check_ins ------------------------------------------------------------------
grant select on public.check_ins to authenticated;
grant insert (
  goal_id,
  user_id,
  check_in_date,
  note
) on public.check_ins to authenticated;
grant update (note) on public.check_ins to authenticated;
grant delete on public.check_ins to authenticated;

-- ---------------------------------------------------------------------------
-- Future tables
-- ---------------------------------------------------------------------------
-- Stop the default from re-creating this problem. Without this, the next
-- CREATE TABLE in public silently grants ALL to anon and authenticated again,
-- and the next person has to rediscover why their column grants do nothing.
--
-- This alters the default for tables created by the migration role. It does not
-- touch existing tables, which the explicit revokes above have already handled.

alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- service_role keeps its default grants. It is intended for server-side use
-- with the secret key, bypasses RLS regardless of grants, and no MAX code uses
-- it yet. Narrowing it is a separate decision from fixing this defect.
