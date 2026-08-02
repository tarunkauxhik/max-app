-- Test harness setup. Runs first by filename order.
--
-- Nothing in this file belongs in a migration: pgTAP and the helpers below
-- exist only to test the schema, and must never reach a production database.
--
-- No supabase_test_helpers dependency. That package would have to be installed,
-- and installing anything is out of scope, so the two helpers MAX actually
-- needs are defined here instead.
--
-- ---------------------------------------------------------------------------
-- Why every file in this suite opens with the same two lines
-- ---------------------------------------------------------------------------
-- Both were established by running the suite against max-dev on 2026-08-02,
-- not assumed. Before them, all nine files failed identically at line one.
--
-- 1. `set role postgres`
--    `supabase test db --linked` prints "Initialising login role..." and then
--    connects as `cli_login_postgres`, not as `postgres`. That role holds no
--    CREATE on the database (so `create schema tests` is denied) and no USAGE
--    on `extensions` (so no pgTAP function is reachable). It is a member of
--    `postgres` but does not inherit it, which is exactly the case SET ROLE
--    exists for. Verified: before, create=f usage=f; after, create=t usage=t.
--    A `--local` run already connects as `postgres`, so this is a no-op there.
--
-- 2. `set search_path = public, extensions, tests`
--    Supabase installs pgTAP into `extensions` (version 1.3.3, already present
--    on max-dev — the `create extension` below is therefore a no-op that is
--    kept so the suite is self-describing). The remote search_path is
--    `"$user", public`, so an unqualified `plan()` does not resolve. `anon` and
--    `authenticated` both hold USAGE on `extensions` and EXECUTE on the pgTAP
--    functions, so assertions still work while impersonating either role.

-- ---------------------------------------------------------------------------
-- Calling convention for throws_ok
-- ---------------------------------------------------------------------------
-- Always the four-argument form:
--
--   select throws_ok(sql, '42501'::char(5), null::text, 'description');
--
-- The three-argument form reads as (sql, errcode, errmsg) — NOT
-- (sql, errcode, description). Passing a description there asserts it against
-- the real Postgres error text, which never matches. All 27 throws_ok calls in
-- this suite failed that way on the first real run, every one reporting the
-- correct SQLSTATE as "caught" and the description as "wanted".
--
-- `null::text` skips the message check deliberately. Error text is
-- Postgres-version and Supabase-release dependent; the SQLSTATE is the stable
-- contract. Both casts are required: without them the literal is ambiguous
-- between throws_ok(text, character, text, text) and its integer overload.
--
-- Verified not to be vacuous: a negative control asserting a deliberately wrong
-- SQLSTATE failed, and one asserting an exception from a statement that raises
-- none also failed, while the correct code passed.

set role postgres;
set search_path = public, extensions, tests;

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

comment on schema tests is
  'Test-only helpers. Never created by a migration; never present in production.';

-- ---------------------------------------------------------------------------
-- tests.create_user
-- ---------------------------------------------------------------------------
-- THIS IS THE MOST FRAGILE PART OF THE SUITE.
--
-- auth.users is Supabase-managed. Supabase warns that columns, indexes and
-- constraints in its schemas may change at any time, and since 2025-04-21 SQL
-- access to the auth schema has been progressively restricted. Every other test
-- file depends on this insert.
--
-- Verified against max-dev on 2026-08-02 (Postgres 17.6, gotrue schema of that
-- date). auth.users is owned by supabase_auth_admin and has RLS enabled;
-- `postgres` holds INSERT on it and carries BYPASSRLS, which is what makes this
-- work. Only three columns are NOT NULL — id, is_sso_user, is_anonymous — and
-- the latter two default to false, so the list below is comfortably sufficient
-- rather than minimal. The insert was executed and fired handle_new_user,
-- producing exactly one profile row.
--
-- If the suite fails wholesale on a later run, start here: compare this insert
-- against the live auth.users definition before suspecting anything else.
--
-- SECURITY DEFINER because the test role cannot write to auth.users directly.
-- Acceptable only because this function never exists outside a test database.

create or replace function tests.create_user(email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid := pg_catalog.gen_random_uuid();
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    email,
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  );

  return new_id;
end;
$$;

comment on function tests.create_user(text) is
  'Creates an auth.users row and returns its id. Test-only. Fires on_auth_user_created.';

-- ---------------------------------------------------------------------------
-- tests.authenticate_as / tests.as_anon / tests.logout
-- ---------------------------------------------------------------------------
-- Role switching is otherwise written inline in each test file, so the
-- mechanism stays visible rather than hidden behind a helper. These exist only
-- because set_config must be called with a computed value, which plain
-- SET LOCAL cannot do.

create or replace function tests.authenticate_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform pg_catalog.set_config('role', 'authenticated', true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    pg_catalog.json_build_object(
      'sub', user_id::text,
      'role', 'authenticated'
    )::text,
    true
  );
end;
$$;

comment on function tests.authenticate_as(uuid) is
  'Impersonates a user for the current transaction: authenticated role plus a matching sub claim.';

create or replace function tests.as_anon()
returns void
language plpgsql
as $$
begin
  perform pg_catalog.set_config('role', 'anon', true);
  perform pg_catalog.set_config('request.jwt.claims', '', true);
end;
$$;

-- Sets `postgres` explicitly rather than using SET ROLE NONE / RESET ROLE.
-- Both of those return to the *session* user, which on a remote run is
-- `cli_login_postgres` — a role with no USAGE on `extensions` and no EXECUTE on
-- tests.create_user. Verified: SET ROLE NONE lands on cli_login_postgres, so
-- every "logout then create a user" sequence in 003-008 would fail there.
-- `postgres` is the privileged project role on both local and hosted Supabase,
-- so naming it is portable rather than environment-specific.
create or replace function tests.logout()
returns void
language plpgsql
as $$
begin
  perform pg_catalog.set_config('role', 'postgres', true);
  perform pg_catalog.set_config('request.jwt.claims', '', true);
end;
$$;

comment on function tests.logout() is
  'Returns to the postgres role. Required before creating users, which authenticated cannot do.';

-- ---------------------------------------------------------------------------
-- Helper privileges
-- ---------------------------------------------------------------------------
-- Even in a test database the helpers are split by capability. create_user is
-- SECURITY DEFINER and writes to auth.users; if an application role could call
-- it, that role could mint accounts. The role-switching helpers are harmless by
-- comparison — they only change the current transaction's own identity.
--
-- Postgres grants EXECUTE to PUBLIC on every new function, so each revoke below
-- is undoing a default rather than being merely cautious.

grant usage on schema tests to anon, authenticated;

-- No CREATE: an application role must not be able to add objects to a schema
-- whose functions run as their definer.
revoke create on schema tests from public, anon, authenticated;

revoke all on function tests.create_user(text) from public, anon, authenticated;

grant execute on function tests.authenticate_as(uuid) to anon, authenticated;
grant execute on function tests.as_anon() to anon, authenticated;
grant execute on function tests.logout() to anon, authenticated;

-- The test files call tests.create_user only after tests.logout(), i.e. as
-- postgres, so the revoke above does not obstruct them. 008 asserts that an
-- application role genuinely cannot call it.

-- ---------------------------------------------------------------------------
-- Smoke test
-- ---------------------------------------------------------------------------
-- This file is run by the test runner like any other, so it has to emit TAP.
-- Without a plan and a finish it produces no output at all, which a TAP
-- consumer reads as a file that failed to run rather than as a file with
-- nothing to say.
--
-- Everything above stays outside this transaction on purpose. The extension,
-- the schema, the helpers and the grants must survive for 001 through 008 to
-- have anything to call; wrapping them in the rollback below would destroy the
-- harness the moment it finished building it.
--
-- Only the assertion is transactional, and it creates nothing, so the rollback
-- discards an empty transaction.

begin;
select plan(1);

-- to_regprocedure returns null rather than raising when the function is absent,
-- so a missing helper reports as a clean failed assertion instead of an error
-- that stops the run before any TAP is emitted.
select ok(
  to_regprocedure('tests.create_user(text)') is not null,
  'database test helpers loaded'
);

select * from finish();
rollback;
