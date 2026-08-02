-- Matrix cases 15-21: constraints and the two time-dependent triggers.
--
-- Everything here runs as the owning user, so a failure means the constraint or
-- trigger fired rather than RLS.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(21);

select tests.logout();
select tests.create_user('constraints@example.test') as u_id \gset
select tests.authenticate_as(:'u_id');

insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'u_id', 'Constraint fixture goal', 30, 8, 'steady', current_date)
returning id as goal_id \gset

-- ---------------------------------------------------------------------------
-- Case 15: no duplicate daily check-ins (2)
-- ---------------------------------------------------------------------------
select lives_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, current_date) $$, :'goal_id', :'u_id'),
  'case 15a: the first check-in for today succeeds');

select throws_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, current_date) $$, :'goal_id', :'u_id'),
  '23505'::char(5),
  null::text,
  'case 15: a second check-in for the same goal and day is rejected');

-- ---------------------------------------------------------------------------
-- Case 16: no duplicate scheduled actions (2)
-- ---------------------------------------------------------------------------
select lives_ok(
  format($$ insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
            values (%L, %L, current_date, 1, 'First action') $$, :'goal_id', :'u_id'),
  'case 16a: the first action in slot 1 succeeds');

select throws_ok(
  format($$ insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
            values (%L, %L, current_date, 1, 'Colliding action') $$, :'goal_id', :'u_id'),
  '23505'::char(5),
  null::text,
  'case 16: a second action in the same goal/date/position is rejected');

-- ---------------------------------------------------------------------------
-- Case 17: future check-in dates rejected; boundaries accepted (3)
-- ---------------------------------------------------------------------------
-- The fixture profile is still UTC here, so local today is the server's date.
select throws_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, current_date + 7) $$, :'goal_id', :'u_id'),
  '22023'::char(5),
  null::text,
  'case 17: a check-in a week in the future is rejected');

select throws_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, current_date + 1) $$, :'goal_id', :'u_id'),
  '22023'::char(5),
  null::text,
  'case 17b: tomorrow is rejected — the boundary is today, not near-today');

-- Backdating is legitimate: catching up on yesterday is normal use.
select lives_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, current_date - 1) $$, :'goal_id', :'u_id'),
  'case 17c: yesterday is accepted — the valid boundary succeeds');

-- ---------------------------------------------------------------------------
-- Case 18: timezone validation (2)
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$ update public.profiles set timezone = 'Not/AZone' where id = %L $$, :'u_id'),
  '22023'::char(5),
  null::text,
  'case 18: an invented timezone is rejected');

select lives_ok(
  format($$ update public.profiles set timezone = 'Asia/Kolkata' where id = %L $$, :'u_id'),
  'case 18b: a real IANA name is accepted');

-- ---------------------------------------------------------------------------
-- Local-day boundary is the OWNER'S day, not the server's (3)
-- ---------------------------------------------------------------------------
-- Pacific/Kiritimati is UTC+14, the furthest-ahead zone in use. For ten hours
-- of every UTC day its local date is already tomorrow, so this is the case that
-- distinguishes a real timezone-aware boundary from a server-date comparison.
--
-- The expected date is computed the same way the trigger computes it, so the
-- assertions are deterministic at any hour rather than passing only overnight.
-- A second goal avoids colliding with the check-ins inserted above.

insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'u_id', 'Timezone boundary fixture', 20, 4, 'gentle', current_date)
returning id as tz_goal_id \gset

update public.profiles set timezone = 'Pacific/Kiritimati' where id = :'u_id';

select (now() at time zone 'Pacific/Kiritimati')::date as local_today \gset

select lives_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, %L) $$, :'tz_goal_id', :'u_id', :'local_today'),
  'the owner''s local today is accepted, even when it is ahead of the server date');

select throws_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, %L::date + 1) $$, :'tz_goal_id', :'u_id', :'local_today'),
  '22023'::char(5),
  null::text,
  'the day after the owner''s local today is rejected');

select lives_ok(
  format($$ insert into public.check_ins (goal_id, user_id, check_in_date)
            values (%L, %L, %L::date - 1) $$, :'tz_goal_id', :'u_id', :'local_today'),
  'the day before the owner''s local today is accepted');

-- ---------------------------------------------------------------------------
-- Case 19: goal title length (1)
-- ---------------------------------------------------------------------------
-- Mirrors validateTitle in features/goals/types.ts. Client validation is UX;
-- this is the enforcement.
select throws_ok(
  format($$ insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
            values (%L, 'ab', 30, 8, 'steady', current_date) $$, :'u_id'),
  '23514'::char(5),
  null::text,
  'case 19: a two-character goal title is rejected');

-- ---------------------------------------------------------------------------
-- Case 20: interests cap and allowed values (2)
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$ update public.profiles
               set interests = array['fitness','learning','career','wellbeing']
             where id = %L $$, :'u_id'),
  '23514'::char(5),
  null::text,
  'case 20: a fourth interest is rejected');

select throws_ok(
  format($$ update public.profiles set interests = array['astrology'] where id = %L $$, :'u_id'),
  '23514'::char(5),
  null::text,
  'case 20b: an interest outside the fixed set is rejected');

-- ---------------------------------------------------------------------------
-- Case 21: the goal lifecycle invariant (6)
-- ---------------------------------------------------------------------------
-- One constraint now covers all three states. The tests below walk a goal
-- through its whole life, including the state the previous pair of constraints
-- made impossible.

select throws_ok(
  format($$ update public.goals set status = 'completed' where id = %L $$, :'goal_id'),
  '23514'::char(5),
  null::text,
  'case 21: completed status without completed_at is rejected');

select throws_ok(
  format($$ update public.goals set completed_at = now() where id = %L $$, :'goal_id'),
  '23514'::char(5),
  null::text,
  'case 21b: an active goal carrying completed_at is rejected');

select throws_ok(
  format($$ update public.goals set archived_at = now() where id = %L $$, :'goal_id'),
  '23514'::char(5),
  null::text,
  'case 21c: an active goal carrying archived_at is rejected');

select lives_ok(
  format($$ update public.goals
               set status = 'completed', completed_at = now()
             where id = %L $$, :'goal_id'),
  'case 21d: completing a goal with its timestamp succeeds');

-- The state the superseded constraints forbade. Finishing a goal and later
-- filing it away are different events, and archiving must not erase the first.
select lives_ok(
  format($$ update public.goals
               set status = 'archived', archived_at = now()
             where id = %L $$, :'goal_id'),
  'case 21e: a completed goal can be archived');

select isnt(
  (select completed_at from public.goals where id = :'goal_id'),
  null,
  'case 21f: archiving preserves completed_at');

select * from finish();
rollback;
