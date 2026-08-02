-- Column and function privileges.
--
-- RLS answers "which rows?". It says nothing about "which columns?". A policy
-- of user_id = auth.uid() is fully satisfied by an UPDATE that rewrites
-- created_at, or that re-parents an action to a different goal. Column grants
-- are the only thing preventing that, and nothing else in this suite would
-- notice if they were widened to the whole table.
--
-- The trigger functions are checked here too: Postgres grants EXECUTE to PUBLIC
-- on every new function, so each one has to be explicitly taken back.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(26);

-- ---------------------------------------------------------------------------
-- Columns authenticated MAY write (6)
-- ---------------------------------------------------------------------------
select ok(has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'),
  'authenticated can update profiles.display_name');
select ok(has_column_privilege('authenticated', 'public.profiles', 'timezone', 'UPDATE'),
  'authenticated can update profiles.timezone');
select ok(has_column_privilege('authenticated', 'public.goals', 'user_id', 'INSERT'),
  'authenticated can set goals.user_id at insert time');
select ok(has_column_privilege('authenticated', 'public.goals', 'status', 'UPDATE'),
  'authenticated can update goals.status, which is how archiving works');
select ok(has_column_privilege('authenticated', 'public.goal_actions', 'completed_at', 'UPDATE'),
  'authenticated can complete an action');
select ok(has_column_privilege('authenticated', 'public.check_ins', 'note', 'UPDATE'),
  'authenticated can edit a check-in note');

-- ---------------------------------------------------------------------------
-- Columns authenticated MAY NOT write (10)
-- ---------------------------------------------------------------------------
-- Identity columns. Rewriting a primary key is never a product operation.
select ok(not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'),
  'profiles.id is not updatable');
select ok(not has_column_privilege('authenticated', 'public.goals', 'id', 'UPDATE'),
  'goals.id is not updatable');

-- Ownership after creation. This is the second line of defence behind the
-- WITH CHECK clause, and it fires first.
select ok(not has_column_privilege('authenticated', 'public.goals', 'user_id', 'UPDATE'),
  'goals.user_id cannot be updated, so ownership cannot be transferred');
select ok(not has_column_privilege('authenticated', 'public.goal_actions', 'user_id', 'UPDATE'),
  'goal_actions.user_id cannot be updated');
select ok(not has_column_privilege('authenticated', 'public.goal_actions', 'goal_id', 'UPDATE'),
  'an action cannot be re-parented to another goal');
select ok(not has_column_privilege('authenticated', 'public.check_ins', 'user_id', 'UPDATE'),
  'check_ins.user_id cannot be updated');

-- check_in_date is the identity of a check-in. Moving it would silently rewrite
-- a streak, and would bypass the write-time validation entirely.
select ok(not has_column_privilege('authenticated', 'public.check_ins', 'check_in_date', 'UPDATE'),
  'check_ins.check_in_date cannot be moved after the fact');

-- Server-owned timestamps.
select ok(not has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE'),
  'profiles.created_at is server-owned');
select ok(not has_column_privilege('authenticated', 'public.goals', 'created_at', 'UPDATE'),
  'goals.created_at is server-owned');
select ok(not has_column_privilege('authenticated', 'public.goals', 'updated_at', 'UPDATE'),
  'goals.updated_at is maintained by trigger, not by clients');

-- ---------------------------------------------------------------------------
-- Sweep: no server-owned column is writable anywhere (1)
-- ---------------------------------------------------------------------------
-- Catches a future grant that adds a column to the wrong list.
select is_empty(
  $$ select table_name, column_name
       from information_schema.column_privileges
      where grantee = 'authenticated'
        and table_schema = 'public'
        and privilege_type = 'UPDATE'
        and column_name in ('id', 'user_id', 'created_at', 'updated_at') $$,
  'no identity, ownership or server-owned timestamp column is updatable');

-- ---------------------------------------------------------------------------
-- Internal functions are not callable directly (6)
-- ---------------------------------------------------------------------------
-- These run as triggers. EXECUTE is checked when a trigger is created, not when
-- it fires, so revoking here hardens them without breaking any write.
select ok(not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE'),
  'authenticated cannot call set_updated_at directly');
select ok(not has_function_privilege('authenticated', 'public.validate_timezone()', 'EXECUTE'),
  'authenticated cannot call validate_timezone directly');
select ok(not has_function_privilege('authenticated', 'public.validate_check_in_date()', 'EXECUTE'),
  'authenticated cannot call validate_check_in_date directly');

-- handle_new_user is SECURITY DEFINER. A callable SECURITY DEFINER function in
-- a public schema is a public API endpoint that bypasses RLS.
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'authenticated cannot call handle_new_user directly');
select ok(not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anon cannot call handle_new_user directly');

-- The test helper mints accounts. It must stay unreachable from app roles even
-- in a test database.
select ok(not has_function_privilege('authenticated', 'tests.create_user(text)', 'EXECUTE'),
  'authenticated cannot call tests.create_user');

-- ---------------------------------------------------------------------------
-- Behavioural confirmation (3)
-- ---------------------------------------------------------------------------
-- Privilege catalogues can be read wrongly. These prove the effect.
select tests.logout();
select tests.create_user('column-privs@example.test') as u_id \gset
select tests.authenticate_as(:'u_id');

insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'u_id', 'Column privilege fixture', 30, 8, 'steady', current_date)
returning id as goal_id \gset

insert into public.check_ins (goal_id, user_id, check_in_date, note)
values (:'goal_id', :'u_id', current_date, 'original note');

select throws_ok(
  format($$ update public.goals set created_at = now() where id = %L $$, :'goal_id'),
  '42501'::char(5),
  null::text,
  'updating a server-owned timestamp is refused in practice');

select throws_ok(
  format($$ update public.check_ins set check_in_date = current_date - 1
             where goal_id = %L $$, :'goal_id'),
  '42501'::char(5),
  null::text,
  'moving a check-in to another day is refused in practice');

select lives_ok(
  format($$ update public.check_ins set note = 'edited note' where goal_id = %L $$, :'goal_id'),
  'the one editable column on check_ins still works');

select * from finish();
rollback;
