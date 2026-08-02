-- Matrix cases 6-14: two users, and the wall between them.
--
-- User A owns data. User B exists. B must never read or mutate A's rows, and
-- A must never be able to hand a row to B.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(14);

select tests.logout();

select tests.create_user('user-a@example.test') as a_id \gset
select tests.create_user('user-b@example.test') as b_id \gset

-- A creates a full set of rows.
select tests.authenticate_as(:'a_id');

insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'a_id', 'Run a half marathon', 30, 8, 'steady', current_date)
returning id as a_goal_id \gset

insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
values (:'a_goal_id', :'a_id', current_date, 1, 'Easy 5 km run');

insert into public.check_ins (goal_id, user_id, check_in_date, note)
values (:'a_goal_id', :'a_id', current_date, 'Legs felt good');

-- B creates one goal, so "A sees 1 row" proves filtering rather than emptiness.
select tests.authenticate_as(:'b_id');

insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'b_id', 'Read 20 pages a day', 20, 12, 'gentle', current_date)
returning id as b_goal_id \gset

-- ---------------------------------------------------------------------------
-- Cases 6-8: A sees only A's rows (3)
-- ---------------------------------------------------------------------------
select tests.authenticate_as(:'a_id');

select results_eq(
  'select count(*)::int from public.goals',
  array[1],
  'case 6: A sees exactly one goal, not B''s as well');

select results_eq(
  'select count(*)::int from public.goal_actions',
  array[1],
  'case 7: A sees only A''s goal_actions');

select results_eq(
  'select count(*)::int from public.check_ins',
  array[1],
  'case 8: A sees only A''s check_ins');

-- ---------------------------------------------------------------------------
-- Cases 9-13: A cannot reach across (6)
-- ---------------------------------------------------------------------------
-- An UPDATE blocked by RLS is not an error: the row is invisible, so zero rows
-- match. Silence is the correct behaviour, and worth asserting explicitly
-- because it is easy to mistake for success.
select results_eq(
  format($$ with updated as (
              update public.goals set title = 'hijacked by A'
              where id = %L returning 1
            ) select count(*)::int from updated $$, :'b_goal_id'),
  array[0],
  'case 9: A updating B''s goal affects zero rows');

select throws_ok(
  format($$ insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
            values (%L, 'Planted in B''s account', 30, 8, 'steady', current_date) $$, :'b_id'),
  '42501'::char(5),
  null::text,
  'case 10: A cannot insert a goal owned by B');

-- The one most schemas get wrong, and now defended twice over.
--
-- user_id is absent from the UPDATE column grant, so this is refused at the
-- privilege layer before RLS is consulted. Were that grant ever widened, the
-- WITH CHECK clause on goals_update_own would still reject it: USING alone
-- would not, because the row is visible to A before the change and only
-- WITH CHECK evaluates the row as it would be afterwards.
--
-- Both layers raise 42501, so this assertion holds whichever one fires. 008
-- pins the column grant itself, so a regression there is still caught.
select throws_ok(
  format($$ update public.goals set user_id = %L where user_id = %L $$, :'b_id', :'a_id'),
  '42501'::char(5),
  null::text,
  'case 11: A cannot reassign their own goal to B');

select results_eq(
  format($$ with deleted as (
              delete from public.check_ins where user_id = %L returning 1
            ) select count(*)::int from deleted $$, :'b_id'),
  array[0],
  'case 12: A deleting B''s check-ins affects zero rows');

-- Two independent defences: the RLS policy rejects user_id <> auth.uid(), and
-- the composite FK rejects the (goal_id, user_id) pair regardless of policy.
select throws_ok(
  format($$ insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
            values (%L, %L, current_date, 1, 'Planted action') $$, :'b_goal_id', :'b_id'),
  '42501'::char(5),
  null::text,
  'case 13a: A cannot insert an action into B''s goal');

-- Same attempt, but claiming A's own user_id against B's goal. RLS now passes,
-- so this proves the composite FK is doing independent work: 23503 is
-- foreign_key_violation.
select throws_ok(
  format($$ insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
            values (%L, %L, current_date, 2, 'Mismatched pair') $$, :'b_goal_id', :'a_id'),
  '23503'::char(5),
  null::text,
  'case 13b: composite FK rejects a goal_id/user_id mismatch on its own');

-- ---------------------------------------------------------------------------
-- Case 14: profiles are private (1)
-- ---------------------------------------------------------------------------
select is_empty(
  format($$ select * from public.profiles where id = %L $$, :'b_id'),
  'case 14: A cannot read B''s profile');

-- ---------------------------------------------------------------------------
-- A retains full control of A's own rows (4)
-- ---------------------------------------------------------------------------
-- Isolation that also blocks the owner is a bug, not security.
select lives_ok(
  format($$ update public.goals set title = 'Run a full marathon' where id = %L $$, :'a_goal_id'),
  'A can update A''s own goal');

select lives_ok(
  format($$ update public.goal_actions set completed_at = now() where user_id = %L $$, :'a_id'),
  'A can complete A''s own action');

select lives_ok(
  format($$ delete from public.check_ins where user_id = %L $$, :'a_id'),
  'A can delete A''s own check-in');

select lives_ok(
  format($$ update public.profiles set bio = 'Building small daily habits' where id = %L $$, :'a_id'),
  'A can update A''s own profile');

select * from finish();
rollback;
