-- Matrix cases 1-3: anonymous access.
--
-- MAX has no unauthenticated surface. Every table holds personal data owned by
-- exactly one account, so anon must be refused outright.
--
-- Note what "refused" means here. anon holds no privilege on these tables, so a
-- SELECT is rejected at the privilege layer with 42501 (insufficient_privilege)
-- before RLS is ever consulted. An earlier version of this file asserted an
-- empty result instead, which was wrong in an important way: an empty result
-- and a refusal are different outcomes, and a suite that accepts either would
-- keep passing if the revoke were removed and RLS alone were left holding the
-- line.
--
-- Cases 4 and 5 of the matrix are HTTP-level and cannot be expressed in SQL;
-- see the M2d report for the curl equivalents. Both surface this same 42501
-- through PostgREST, as a JSON error body rather than an empty array.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(9);

-- Seed one row per table as a real user, so the refusals below are refusals of
-- data that genuinely exists.
select tests.logout();

select tests.create_user('anon-probe-owner@example.test') as owner_id \gset

select tests.authenticate_as(:'owner_id');

insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'owner_id', 'Seeded goal for anon tests', 30, 8, 'steady', current_date);

insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
select id, :'owner_id', current_date, 1, 'Seeded action'
from public.goals where user_id = :'owner_id';

insert into public.check_ins (goal_id, user_id, check_in_date, note)
select id, :'owner_id', current_date, 'Seeded check-in'
from public.goals where user_id = :'owner_id';

-- ---------------------------------------------------------------------------
-- Cases 1 and 2: anon cannot read (4)
-- ---------------------------------------------------------------------------
select tests.as_anon();

select throws_ok(
  'select * from public.profiles',
  '42501'::char(5),
  null::text,
  'case 1: anon reading profiles is refused, not merely empty');

select throws_ok(
  'select * from public.goals',
  '42501'::char(5),
  null::text,
  'case 2a: anon reading goals is refused');

select throws_ok(
  'select * from public.goal_actions',
  '42501'::char(5),
  null::text,
  'case 2b: anon reading goal_actions is refused');

select throws_ok(
  'select * from public.check_ins',
  '42501'::char(5),
  null::text,
  'case 2c: anon reading check_ins is refused');

-- ---------------------------------------------------------------------------
-- Case 3: anon cannot write (4)
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$ insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
            values (%L, 'Anonymous goal', 30, 8, 'steady', current_date) $$, :'owner_id'),
  '42501'::char(5),
  null::text,
  'case 3a: anon cannot insert a goal');

select throws_ok(
  $$ update public.goals set title = 'hijacked' $$,
  '42501'::char(5),
  null::text,
  'case 3b: anon cannot update a goal');

select throws_ok(
  $$ delete from public.check_ins $$,
  '42501'::char(5),
  null::text,
  'case 3c: anon cannot delete a check-in');

select throws_ok(
  $$ update public.profiles set bio = 'hijacked' $$,
  '42501'::char(5),
  null::text,
  'case 3d: anon cannot update a profile');

-- ---------------------------------------------------------------------------
-- anon holds no privilege at all (1)
-- ---------------------------------------------------------------------------
-- Catches a future GRANT ... TO anon that the behavioural assertions above
-- might not reach. Covers column-level grants too, since column_privileges
-- would report them independently of table_privileges.
select is_empty(
  $$ select table_name, privilege_type
       from information_schema.table_privileges
      where grantee = 'anon' and table_schema = 'public'
      union all
     select table_name, privilege_type
       from information_schema.column_privileges
      where grantee = 'anon' and table_schema = 'public' $$,
  'anon holds no table or column privilege anywhere in public');

select * from finish();
rollback;
