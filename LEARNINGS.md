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

- Date: 2026-08-04
- Area: verifying derived numbers before a device run
- Symptom: none on screen. The Insights "recent check-ins" list reported a plausible actions ratio
  that was silently wrong — a check-in against a three-action goal read `9/9` on a day three goals
  were active.
- Root cause: `buildRecentCheckIns` matched `goal_actions` on `scheduled_date` alone. A check-in
  belongs to one goal, so the filter pooled every goal's actions for that day. Both numbers were real
  and their ratio was even correct-looking, which is why nothing about the screen would have flagged
  it.
- Verified fix: match on `goal_id` **and** date, and show the goal title on each row so two check-ins
  made on the same day are distinguishable at all.
- Test/evidence: found by computing the expected figures with `supabase db query` **before** writing
  the device-test guide, in order to state exact numbers the tester could compare against. Writing
  "this must read 3/3" required knowing what the code would produce, and that is what exposed the
  mismatch. The device run then confirmed every figure — streaks, the week denominator, per-goal
  ratios and cross-account isolation — against the query.
- Also verified the same way: `computeStreaks` and `currentWeekOf` were executed against the real
  source files, with only the import path rewritten, over 27 cases including month ends, year ends,
  leap days, duplicate dates from two goals on one day, unsorted input and goals run past their
  duration. Node 24 runs TypeScript directly with `--experimental-strip-types`, so this needs no test
  runner and no dependency.
- Should a rule or skill change be proposed? Yes. **Derive the expected values from the database
  before asking for a device test, not after.** A screen full of plausible numbers is unfalsifiable by
  looking at it; a tester can only confirm a number they were given in advance. This is the same
  lesson as the pgTAP `throws_ok` entry — an assertion nobody executed proves nothing — applied to
  derived UI figures, where the failure mode is quieter because nothing errors.

- Date: 2026-08-02
- Area: checking an Expo bundle for leaked secrets
- Symptom: `grep -c "sb_secret_"` against the exported Android Hermes bundle returned 1, and
  `grep -cE "sb_secret_[A-Za-z0-9_-]{10,}"` also returned 1 — which reads as a secret key compiled
  into the app.
- Root cause: two independent false-positive sources. `@supabase/supabase-js` ships the literal
  itself, in `isNewApiKey` at `dist/index.mjs:339`:
  `key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")`. And Hermes packs its string
  table without separators, so a regex asking for "prefix followed by ten key characters" happily
  matches the bytes of whatever string was pooled next.
- Verified fix: none needed — there was no leak. Established by removing the guard literal from
  `lib/supabase.ts`, rebuilding, and finding the count unchanged at 1, which located the occurrence
  in library code rather than in project code or `.env`. Hermes also pools identical literals, which
  is why the project's own guard string and the library's did not sum to 2.
- Test/evidence: the decisive check is not a grep at all. `expo export` prints the variables it
  exports — here exactly `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — and
  Metro inlines only `EXPO_PUBLIC_*`. Nothing else in `.env` can reach a bundle by any path. A
  secret could therefore only leak by being stored *in* the publishable variable, which
  `lib/supabase.ts` now throws on at module load.
- Also verified: `.env` takes precedence over the shell environment in Expo CLI. An attempt to
  override `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on the command line was ignored, so that is not a
  usable way to build a bundle with substitute credentials.
- Should a rule or skill change be proposed? Yes. "Grep the bundle for the secret" is a weak check
  that produces false positives and, worse, would produce false *negatives* against a re-encoded or
  minified value. Verify the inlining boundary — which variables are exported, and that the prefix
  is enforced at load — rather than searching the artefact for a string.

- Date: 2026-08-02
- Area: Expo Router typed routes and route groups
- Symptom: `tsc --noEmit` rejected `router.push('/sign-up')` with "not assignable", for a file that
  existed. Regenerating the types then revealed a second, quieter problem: both `(auth)` and `(tabs)`
  were claiming the pathname `/`.
- Root cause: two separate facts. **Typed routes are regenerated by the Metro dev server, not by the
  bundler.** `expo export` completes without touching `.expo/types/router.d.ts`, so a route added and
  then verified only with `tsc` and `export` is typechecked against a stale route table. And **route
  groups contribute no URL segment**, so `app/(auth)/index.tsx` and `app/(tabs)/index.tsx` both
  resolve to `/`. Only one is ever mounted, so nothing breaks visibly — but `/` means two different
  screens depending on session state, and a later `router.replace('/')` after sign-in could land back
  on the sign-in screen.
- Verified fix: run `expo start` and wait for `.expo/types/router.d.ts` to update before trusting a
  route-related typecheck. Rename `app/(auth)/index.tsx` to `sign-in.tsx`, declare
  `unstable_settings = { anchor: 'sign-in' }`, and change the two `router.dismissTo('/')` calls to
  `dismissTo('/sign-in')`.
- Test/evidence: the regenerated file lists distinct pathnames — `${'/(auth)'}/sign-in`,
  `${'/(auth)'}/sign-up`, `${'/(tabs)'}` — with no shared `/`. An earlier grep appeared to show the
  collision persisting, because it was matching across alternation boundaries in the generated union;
  the pathname list is the authoritative part of that file, not a regex over it.
- Should a rule or skill change be proposed? No, but pair it with the existing M1c entry: a new route
  group needs an explicit anchor **and** a filename that does not collide with another group's index.
  Two groups that both contain `index.tsx` are always ambiguous, and the generated types are where
  that becomes visible.

- Date: 2026-08-02
- Area: `expo-sqlite` subpath typings
- Symptom: none visible — both `expo-sqlite/localStorage/install` and `expo-sqlite/kv-store` compile
  cleanly under `strict`, so the choice looked like style.
- Root cause: they are not equivalent. `./kv-store` declares both `default` and `types` in the export
  map; `./localStorage/install` declares only `default`. The shim therefore contributes no types of
  its own, and the global `localStorage` it installs is described by the DOM `Storage` interface that
  `expo/tsconfig.base` supplies through `lib: ["DOM", "ESNext"]` — a browser definition standing in
  for a React Native module, which happens to be structurally compatible with Supabase's
  `SupportedStorage`.
- Verified fix: import `expo-sqlite/kv-store`. It also offers `getItemSync`/`setItemSync`, which the
  per-account onboarding read needs — an async read would open a gap in which the route guard has to
  render something before it knows whether onboarding is complete.
- Test/evidence: `node -e` over `expo-sqlite/package.json` shows
  `"./kv-store": { default, types }` against `"./localStorage/install": { default }`.
  `expo/tsconfig.base.json` line 9 is `"lib": ["DOM", "ESNext"]`.
- Should a rule or skill change be proposed? No, but it generalises: "it typechecks" says nothing
  about *where the types came from*. Check the export map before assuming a subpath is typed,
  especially when following a guide that shows a different entry point. This matters again at M6,
  which reuses this package for the offline cache.

- Date: 2026-08-02
- Area: Hermes `Intl` timezone on React Native 0.81
- Symptom: none — this records a measurement that contradicts the documentation found while planning.
- Root cause: n/a. Widely cited reports, and several still-open library issues, say Hermes does not
  expose the platform timezone to `Intl` and that
  `Intl.DateTimeFormat().resolvedOptions().timeZone` returns `"UTC"` on every device. M5a was planned
  defensively on that basis.
- Verified fix: none needed. **On device it returns the real zone.** An Asia/Kolkata phone reported
  `"Asia/Calcutta"` — correct, under the tz database's legacy alias rather than the canonical name.
  The alias is deliberately not normalised: `Asia/Calcutta` is present in `pg_timezone_names`, has
  the same `+05:30` offset as `Asia/Kolkata`, and `now() at time zone` returns an identical result
  for both, so mapping aliases would mean shipping a copy of the tz backward file to produce a value
  Postgres already treats as the same.
- Test/evidence: measured by displaying the stored value in the app rather than by adding a
  temporary `console.log`, because SECURITY.md records that the app contains none and that should
  stay true. Confirmed server-side afterwards: two `profiles` rows hold `Asia/Calcutta`, and
  `'Asia/Calcutta' in (select name from pg_timezone_names)` is true. The `validate_timezone` trigger
  accepted it, which is the part that would have failed had the alias been unknown.
- Should a rule or skill change be proposed? No, but note the shape of the mistake avoided: the
  defensive design — return null rather than store a guess — was right to build and cost nothing once
  the answer turned out to be favourable. The null path is kept, because `Intl` can still be absent
  from a minimal engine build and an engine can regress. Stale ecosystem reports are a reason to
  measure, not a reason to believe.
