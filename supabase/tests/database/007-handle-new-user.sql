-- Matrix cases 23-24: the signup trigger, including how it fails.
--
-- handle_new_user runs inside the signup transaction. If it raises, the signup
-- raises with it and no account is created. That is the intended design — an
-- auth.users row with no profile would break every foreign key downstream — but
-- an intended failure mode still has to be demonstrated rather than assumed.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(9);

select tests.logout();

-- ---------------------------------------------------------------------------
-- Case 23: signup creates exactly one profile (5)
-- ---------------------------------------------------------------------------
select tests.create_user('fresh-signup@example.test') as new_id \gset

select results_eq(
  format($$ select count(*)::int from public.profiles where id = %L $$, :'new_id'),
  array[1],
  'case 23: signup creates exactly one profile row');

select results_eq(
  format($$ select timezone from public.profiles where id = %L $$, :'new_id'),
  array['UTC'],
  'case 23b: the new profile defaults to UTC until the client sets a real zone');

select results_eq(
  format($$ select cardinality(interests)::int from public.profiles where id = %L $$, :'new_id'),
  array[0],
  'case 23c: interests starts empty');

-- The trigger deliberately ignores raw_user_meta_data. That field is
-- user-editable, so copying it would let a signup dictate its own profile.
select is(
  (select display_name from public.profiles where id = :'new_id'),
  null,
  'case 23d: display_name is null — user metadata is never trusted');

select is(
  (select onboarding_completed_at from public.profiles where id = :'new_id'),
  null,
  'case 23e: onboarding is not marked complete by signup');

-- ---------------------------------------------------------------------------
-- Idempotency (1)
-- ---------------------------------------------------------------------------
-- ON CONFLICT DO NOTHING means a re-fired trigger, or a profile created by some
-- future path, cannot turn into a signup failure.
select lives_ok(
  format($$ insert into public.profiles (id) values (%L) on conflict (id) do nothing $$, :'new_id'),
  'a second insert for the same id is absorbed, not raised');

-- ---------------------------------------------------------------------------
-- Case 24: the failure mode is visible (3)
-- ---------------------------------------------------------------------------
-- Break the function on purpose, inside this transaction, and confirm the
-- consequence reaches the caller. Everything is rolled back at the end.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'deliberate failure for test case 24' using errcode = 'P0001';
end;
$$;

select throws_ok(
  $$ select tests.create_user('blocked-signup@example.test') $$,
  'P0001'::char(5),
  null::text,
  'case 24: a failing handle_new_user propagates and blocks signup');

select is_empty(
  $$ select 1 from auth.users where email = 'blocked-signup@example.test' $$,
  'case 24b: no orphaned auth.users row survives the failure');

select is_empty(
  $$ select 1 from public.profiles p
       join auth.users u on u.id = p.id
      where u.email = 'blocked-signup@example.test' $$,
  'case 24c: no partial profile survives the failure');

-- The rollback below restores the real handle_new_user. Nothing here escapes
-- the transaction.
select * from finish();
rollback;
