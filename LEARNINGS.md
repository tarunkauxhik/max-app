# Verified learnings

Add only reproducible project-specific facts.

## Template

- Date:
- Area:
- Symptom:
- Root cause:
- Verified fix:
- Test/evidence:
- Should a rule or skill change be proposed?

Skills may propose an update after the same failure pattern appears twice. The user must approve changes to rules or skills.

## Entries

- Date: 2026-08-02
- Area: navigation and safe areas
- Symptom: unclear whether `useSafeAreaInsets` requires a root `SafeAreaProvider` in `app/_layout.tsx`.
- Root cause: none. Expo Router renders a global `SafeAreaProvider` in `ExpoRoot`, above the
  navigator, so every route already has one. Navigator wrappers — `SafeAreaProviderCompat` in
  `@react-navigation/bottom-tabs`, and the native-stack equivalent — additionally support
  consumption inside those navigators, but they are not the source of the global provider.
- Verified fix: none needed. `components/ui/screen.tsx` calls `useSafeAreaInsets` with no root
  provider added, and `app/_layout.tsx` was left unchanged.
- Test/evidence: `SafeAreaProvider` confirmed at `ExpoRoot.js:77` in the installed
  `expo-router`, wrapping the navigator for all routes. Android device pass on tab routes in
  M1a, and on non-tab stack routes in M1b and M1c.
- Should a rule or skill change be proposed? No. The open question this entry originally
  recorded — whether a screen outside the tab navigator would lack a provider — was answered by
  M1b and M1c: `app/goal` and `app/onboarding` sit outside the tabs and receive insets correctly.

- Date: 2026-08-02
- Area: Expo Router initial routes
- Symptom: the onboarding group opened on step 4 of 4 instead of step 1, and pressing Back threw
  `The action 'GO_BACK' was not handled by any navigator`.
- Root cause: `app/onboarding/` had no `index.tsx` and no declared anchor, so the group had no
  defined initial route and resolved to whatever the route tree ordered first. Back then failed
  correctly — that screen genuinely was the first entry in the stack.
- Verified fix: rename `welcome.tsx` to `index.tsx`, declare
  `export const unstable_settings = { anchor: 'index' }` in `app/onboarding/_layout.tsx`, and
  guard every Back control with `router.canGoBack()`.
- Test/evidence: `getRoutesCore.js` resolves the initial route as
  `unstable_settings.anchor ?? initialRouteName`; Android physical-device pass confirmed the flow
  opens on step 1 and Back behaves.
- Should a rule or skill change be proposed? No, but every new route group should get an
  `index.tsx` and an explicit anchor when it is created, rather than after a device test finds it.

- Date: 2026-08-02
- Area: Supabase privileges and RLS
- Symptom: after applying the M2d migrations, `authenticated` held DELETE, INSERT, REFERENCES,
  SELECT, TRIGGER, TRUNCATE and UPDATE on all four tables, and UPDATE on all 37 columns rather
  than the 20 intended. The carefully written column-level grants had no effect whatsoever.
- Root cause: Supabase ships `ALTER DEFAULT PRIVILEGES` on the `public` schema granting ALL to
  `anon`, `authenticated` and `service_role` for every newly created table. The migration revoked
  from `public, anon` but not from `authenticated`, so that default survived and the column grants
  were purely additive to a set that was already complete. Grants are a union, never a ceiling:
  granting a narrow list after a broad grant narrows nothing.
- Verified fix: a new migration, `20260802100400`, that runs `revoke all ... from authenticated`
  on each table before re-granting the intended columns, plus
  `alter default privileges in schema public revoke all on tables from anon, authenticated` so the
  next `CREATE TABLE` does not silently reintroduce it. The already-applied migration was left
  untouched — editing it would make file and database disagree while `db push` compares history,
  so the edit would never be applied.
- Test/evidence: `information_schema.column_privileges` for `authenticated` went from 37 UPDATE
  columns to exactly 20; `table_privileges` reduced to `SELECT` on all four tables plus `DELETE` on
  `goal_actions` and `check_ins` only; a count of updatable `id`/`user_id`/`created_at`/`updated_at`
  columns went to 0. `anon` was 0 throughout, so that revoke had worked.
- Scope of exposure: RLS was never bypassed. Every policy still restricted rows to
  `(select auth.uid()) = user_id`, so no user could reach another user's data at any point. The
  defect was over-permission within a user's own rows — deleting a profile or goal, and rewriting
  server-owned columns.
- Should a rule or skill change be proposed? Yes. Any migration granting table or column privileges
  in Supabase's `public` schema must `revoke all` from the target role first, and verify the result
  against `information_schema` rather than trusting the grant statements. A grant that "looks
  right" in the migration file proves nothing about the resulting privilege set.

- Date: 2026-08-02
- Area: pgTAP under `supabase test db --linked`
- Symptom: all 9 test files failed identically before their first assertion —
  `function plan(integer) does not exist`, preceded by `permission denied for database postgres` on
  `create schema tests`. `Files=9, Tests=0`.
- Root cause: two independent facts about the remote test connection, neither documented where it
  would have been found. The CLI prints "Initialising login role..." and connects as
  `cli_login_postgres`, not `postgres`. That role holds no CREATE on the database and no USAGE on
  `extensions`, and although it is a member of `postgres` it does not inherit it. Separately,
  Supabase installs pgTAP into `extensions`, which is absent from the remote `search_path`
  (`"$user", public`), so unqualified `plan()` cannot resolve.
- Verified fix: two lines at the top of every test file — `set role postgres;` and
  `set search_path = public, extensions, tests;`. A `--local` run already connects as `postgres`, so
  both are no-ops there and the files stay portable. `tests.logout()` also had to stop using
  `set role none`, which returns to the *session* user — `cli_login_postgres` on a remote run, which
  cannot execute `tests.create_user`. It now sets `postgres` explicitly.
- Test/evidence: measured inside the test connection with `RAISE NOTICE`, since pg_prove discards
  result sets and `\echo` but forwards notices. Before: `create=f usage=f`. After `set role postgres`:
  `create=t usage=t`. `set role none` was confirmed to land on `cli_login_postgres`. pgTAP is 1.3.3
  in `extensions`; `anon` and `authenticated` both hold USAGE there and EXECUTE on its functions, so
  assertions still work while impersonating either role.
- Should a rule or skill change be proposed? No, but record it: the role a test harness connects as
  is part of the test environment and must be measured, not assumed from the role used elsewhere.
  `supabase db query --linked` connects as `postgres`; `supabase test db --linked` does not.

- Date: 2026-08-02
- Area: pgTAP `throws_ok` argument order
- Symptom: once the suite ran, exactly 27 of 170 assertions failed — every `throws_ok` call in the
  suite, and nothing else. Each reported the correct SQLSTATE as `caught` and the assertion's own
  description as `wanted`.
- Root cause: `throws_ok`'s three-argument form is `(sql, errcode, errmsg)`, not
  `(sql, errcode, description)`. Passing a description in slot three asserts it against the real
  Postgres error text, which never matches. The security behaviour was correct throughout — anon was
  refused with `42501`, constraints fired with `23514`, the signup trigger propagated `P0001`. Only
  the assertion was mis-called.
- Verified fix: the four-argument form,
  `throws_ok(sql, '42501'::char(5), null::text, 'description')`. Both casts are required: an
  uncast literal is ambiguous between the `character` and `integer` overloads. `null::text` skips
  the message check deliberately, because error text is Postgres-version and Supabase-release
  dependent while the SQLSTATE is the stable contract.
- Test/evidence: 143/170 before, 170/170 after. Then a negative control, because skipping the
  message check could have made the assertions vacuous: asserting a deliberately wrong SQLSTATE
  failed, asserting an exception from a statement that raises none failed, and the correct SQLSTATE
  passed. The convention is recorded at the top of `000-setup.sql`.
- Should a rule or skill change be proposed? Yes. A test suite that has never been executed is not
  evidence of anything. These 27 assertions had been reviewed twice, and read correctly both times.
  Assertion helpers with optional positional arguments must be checked against their real signature
  in `pg_proc`, not against how they read.

- Date: 2026-08-02
- Area: Supabase `auth.users` shape (previously flagged as the suite's most fragile assumption)
- Symptom: none — this records a verification, not a failure.
- Root cause: n/a. `tests.create_user` was written blind against `auth.users` and documented as a
  guess that could break everything.
- Verified fix: none needed. The insert works as written.
- Test/evidence: on max-dev, `auth.users` is owned by `supabase_auth_admin` and has RLS enabled;
  `postgres` holds INSERT and carries BYPASSRLS, which is what makes the helper work. Only three
  columns are NOT NULL — `id`, `is_sso_user`, `is_anonymous` — and the last two default to false, so
  the eleven-column insert is comfortably sufficient. Executing it fired `handle_new_user` and
  produced exactly one profile row.
- Should a rule or skill change be proposed? No. Re-verify after any Supabase platform upgrade; this
  is measured behaviour of a managed schema, not a contract.
