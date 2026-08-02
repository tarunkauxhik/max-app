-- Row Level Security policies and privilege hardening.
--
-- RLS itself was enabled in 20260802100000 so the tables were never reachable.
-- This migration adds the policies that open specific, owned access.
--
-- Four rules hold for every policy below, each guarding a specific trap:
--
--   1. (select auth.uid()) rather than bare auth.uid(). The subquery form is
--      evaluated once per statement instead of once per row.
--
--   2. TO authenticated, never auth.role(). auth.role() is deprecated, and it
--      breaks silently if anonymous sign-ins are ever enabled, because
--      anonymous users also carry the authenticated role.
--
--   3. UPDATE carries both USING and WITH CHECK. With USING alone a user can
--      reassign user_id and hand their row to somebody else.
--
--   4. Any table with UPDATE also has SELECT. An UPDATE must read the row
--      first; without a SELECT policy it silently affects zero rows and
--      reports no error.
--
-- One policy per operation, never FOR ALL, so each grant is legible on its own.

-- ---------------------------------------------------------------------------
-- profiles: read and update own only
-- ---------------------------------------------------------------------------
-- No INSERT policy: handle_new_user (migration 4) is SECURITY DEFINER and
-- bypasses RLS, so the client never needs to insert. Omitting the policy means
-- a client cannot fabricate profile rows at all.
--
-- No DELETE policy: removing a profile while auth.users survives orphans the
-- account. Deletion belongs to the admin API, and the cascade from auth.users
-- is not subject to RLS.

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- goals: read, create and update own
-- ---------------------------------------------------------------------------
-- No DELETE policy: deletion is archival (status = 'archived'). Without the
-- policy the archive path cannot be bypassed from the client. Account deletion
-- still removes these rows, because cascades ignore RLS.

create policy goals_select_own
  on public.goals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy goals_insert_own
  on public.goals
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy goals_update_own
  on public.goals
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- goal_actions: full ownership
-- ---------------------------------------------------------------------------
-- DELETE is kept: removing a scheduled action is a real user action, and the
-- composite foreign key already guarantees the row belongs to a goal the same
-- user owns.

create policy goal_actions_select_own
  on public.goal_actions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy goal_actions_insert_own
  on public.goal_actions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy goal_actions_update_own
  on public.goal_actions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goal_actions_delete_own
  on public.goal_actions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- check_ins: full ownership
-- ---------------------------------------------------------------------------
-- DELETE is kept: undoing a mistaken check-in is a real user action, and Today
-- already resets check-in state when an action is untoggled.

create policy check_ins_select_own
  on public.check_ins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy check_ins_insert_own
  on public.check_ins
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy check_ins_update_own
  on public.check_ins
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy check_ins_delete_own
  on public.check_ins
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Table and column privileges
-- ---------------------------------------------------------------------------
-- RLS controls which ROWS are visible once a table is reachable. It says
-- nothing about which COLUMNS may be written. A row-level policy of
-- user_id = auth.uid() is perfectly satisfied by an UPDATE that rewrites
-- created_at, so column privileges are the only thing standing between a
-- client and the server-owned parts of its own rows.
--
-- Revoke first, grant second. Revoking after granting would silently undo the
-- grant; revoking from PUBLIC matters because Postgres may have granted it by
-- default, and a privilege held via PUBLIC is invisible in per-role checks.

revoke all on public.profiles from public, anon;
revoke all on public.goals from public, anon;
revoke all on public.goal_actions from public, anon;
revoke all on public.check_ins from public, anon;

-- anon receives nothing, deliberately and permanently. There is no
-- unauthenticated surface in MAX: every table holds personal data belonging to
-- exactly one account.
--
-- service_role is granted nothing either. No server-side component exists yet,
-- and a role that bypasses RLS should acquire access when something actually
-- needs it, not in advance.

-- profiles -------------------------------------------------------------------
-- id is excluded from UPDATE: it is the auth.users foreign key and the identity
-- of the row. created_at and updated_at are server-owned.
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
-- user_id is insertable but NOT updatable: a client sets ownership once, at
-- creation, where the INSERT policy checks it. Allowing it in UPDATE would put
-- the entire weight of preventing ownership transfer on the WITH CHECK clause
-- alone. This makes the attempt fail before RLS is consulted.
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
-- goal_id and user_id are insertable only. Re-parenting an existing action to
-- another goal is not a product operation.
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
-- Only the note is editable. check_in_date is the identity of the check-in and
-- is validated on write; changing it afterwards would move a check-in to a
-- different day and quietly rewrite a streak.
grant select on public.check_ins to authenticated;
grant insert (
  goal_id,
  user_id,
  check_in_date,
  note
) on public.check_ins to authenticated;
grant update (note) on public.check_ins to authenticated;
grant delete on public.check_ins to authenticated;
