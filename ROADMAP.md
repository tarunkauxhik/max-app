# Adaptive roadmap

Only the next milestone is detailed. Later milestones may change after testing.

## M0: verified project baseline

- Create Expo project.
- Verify Expo Go on Android.
- Install trusted skills only.
- Add MAX docs and rules.
- Initialize GitHub repository and push baseline.

## M1a: design foundation — complete (2026-08-02)

Delivered:

- Semantic light and dark design tokens: colour, spacing, radii, typography, elevation, motion.
- Seven reusable UI primitives: Screen, Text, Card, Button, ActionRow, ProgressBar, EmptyState.
- Static Today screen backed by a local fixture; Home tab renamed to Today.

Verified:

- Android physical-device pass in Expo Go (Android 16, API 36, arm64-v8a).
- Accessibility pass: screen-reader labels, roles and checked state; 48dp minimum targets;
  completion never signalled by colour alone.
- Large-font pass: maximum system font size with no clipping.
- WCAG 2.1 contrast pass: 32 of 32 pairs, 4.5:1 for ordinary text and 3:1 for control
  outlines, in both light and dark.
- Strict TypeScript and lint pass.

Constraints held:

- No dependencies added. `package.json`, `pnpm-lock.yaml` and `app.json` unchanged.
- No `android/` or `ios/` directory generated. Expo Go compatibility preserved.

Intentional limitation: completion and check-in state is component-local and resets on
reload. See ADR-005.

## M1b: static goal creation — complete (2026-08-02)

Delivered:

- Four-step local flow: name, daily time, plan (duration and difficulty), review and confirm.
- TextField and OptionGroup primitives.
- `Screen` gained an `edges` prop, so a stack screen showing a header no longer double-pads
  the top inset.
- `Button` gained an optional `accessibilityLabel`, so four repeated "Edit" controls on the
  review step announce distinctly.

Verified:

- Android physical-device pass in Expo Go.
- Input is preserved when moving backward through the flow.
- Inline validation, 48dp targets, large-font pass, strict TypeScript and lint pass.

Constraints held: no dependencies added; `package.json`, `pnpm-lock.yaml` and `app.json`
unchanged.

Intentional limitation: the confirmed goal is session-only and clears on reload. See ADR-005
and ADR-007.

## M1c: static onboarding — complete (2026-08-02)

Delivered:

- Four-step flow: welcome, interests (capped multi-select), commitment, review and confirm.
- MultiOptionGroup primitive and a shared OnboardingStep layout.
- Route gating so the tab tree does not mount until onboarding is passed. See ADR-008.

Verified:

- Android physical-device pass in Expo Go, after fixing the initial-route defect below.
- Protected routes prevent Today from mounting before completion, and leave no onboarding
  entry in the history stack afterwards.
- Selections are preserved when moving backward; strict TypeScript and lint pass.

Found and fixed during device testing: the flow opened on step 4 of 4 and Back threw
`GO_BACK`, because the group had no `index` route and no declared anchor. See LEARNINGS.

Intentional limitation: onboarding completion is held in memory only, so a full reload shows
onboarding again. See ADR-005 and ADR-007.

## M1d: static Insights and Profile — complete (2026-08-02)

Delivered:

- Insights: weekly bars, streak tiles, goal progress, recent check-ins, with loading and
  empty states.
- Profile: identity, achievements, and grouped preference, support, privacy and account rows.
- WeekBars, StatTile, Skeleton and SettingsRow primitives.
- Rows without a handler render as non-interactive text with a visible "Coming later" status,
  rather than as buttons that do nothing.

Verified: Android physical-device pass in Expo Go; strict TypeScript and lint pass.

## M1e: static integration and UX audit — complete (2026-08-02)

The first milestone to treat the app as one product rather than four screens.

Delivered:

- Today renders the goal the user actually created, with actions derived from it, and falls
  back to a reachable empty state when there is none. It previously showed the new goal and an
  unrelated fixture goal side by side.
- Onboarding answers are read back on Profile, so the flow no longer collects input that
  nothing consumes.
- Insights and Profile label their fixtures as sample data; Today does not, because it is now
  live session state. See ADR-009.
- `SummaryRow` extracted and shared by both review screens.
- `error` added to the Insights state union as the agreed shape, without shipping an
  unreachable retry branch. See ADR-009.
- Header roles on the Today and goal-step titles; the empty state uses a neutral tray icon
  rather than a checkmark.
- The Expo demo surface removed: 4 unreferenced components, the unreachable `modal` route,
  their private dependency cluster and 4 unused images. See ADR-010.

Constraints held: no dependencies added; `package.json`, `pnpm-lock.yaml` and `app.json`
unchanged.

Verified: Android physical-device pass in Expo Go; strict TypeScript and lint pass. Committed as
`b12c822`.

## M2: Supabase account and development project — complete (2026-08-02)

Formerly tracked as M2a/M2b. Trusted Supabase skills installed; `max-dev` created on the Free
plan in South Asia (Mumbai) `ap-south-1`, development only. See ADR-011 and
EXTERNAL_SETUP_TRACKER.

Note on numbering: an earlier revision folded schema work into M2 as M2a–M2e. That has been
reconciled to the M1–M11 scheme below. Nothing was dropped — the old M2c and M2d are now M3, and
the old M2e is split across M4 and M5.

## M3: database schema and RLS — complete (2026-08-02)

Formerly M2c and M2d.

Design **complete (2026-08-02)**: four tables — `profiles`, `goals`, `goal_actions`, `check_ins` —
with dated actions, composite-FK ownership, column-level grants and nothing derivable stored.
See ADR-012.

Applied and verified on `max-dev` (2026-08-02):

- 5 migrations applied; migration history confirms local and remote agree.
- 4 tables, RLS enabled on all 4, 13 policies, 5 functions, 5 triggers, signup trigger present.
- `anon` holds zero privileges. `authenticated` holds SELECT on all four tables, DELETE on
  `goal_actions` and `check_ins` only, and UPDATE on exactly the 20 intended columns.
- Zero updatable `id`, `user_id`, `created_at` or `updated_at` columns.

**Defect found and fixed during verification:** the first four migrations left `authenticated`
with ALL privileges on every table, because Supabase's default privileges grant ALL on new tables
in `public` and the migration revoked only from `public` and `anon`. Migration
`20260802100400` corrects it. RLS was never bypassed. See LEARNINGS.

**Tested (2026-08-02): 170 of 170 pgTAP assertions pass across 9 files**, run against `max-dev` with
`supabase test db --linked`. Coverage: schema structure, policy shape, anonymous refusal, two-user
isolation, constraints and triggers, account deletion, the signup trigger, and column and function
privileges.

Two harness defects were found and fixed by that first run. Neither was a schema defect — the schema
passed unchanged:

- Remote runs connect as `cli_login_postgres`, which holds no CREATE on the database and no USAGE on
  `extensions`, so all 9 files failed before their first assertion. Fixed with `set role postgres`
  and an explicit `search_path`.
- All 27 `throws_ok` calls used the three-argument form, which reads as `(sql, errcode, errmsg)`
  rather than `(sql, errcode, description)`. Every one asserted its own description against the real
  Postgres error text. Fixed to the four-argument form, and proven non-vacuous by a negative control.

See LEARNINGS.

## M4: email authentication — complete (2026-08-02)

The first milestone where the app talks to a backend. Built in five slices, each with its own
commit.

Delivered:

- `lib/supabase.ts`, the only place credentials are read. It throws at module load if either
  variable is missing, if the key carries the `sb_secret_` prefix, or if it is not in the
  `sb_publishable_` format — a `.env` mistake fails on first launch rather than shipping.
- A session provider with `loading | signed-out | signed-in`. `loading` holds the native splash
  so a signed-in cold start never flashes the sign-in screen. `onAuthStateChange` is the single
  writer of session state, so a token refresh and a sign-out take the same path.
- Sign-in and sign-up screens built entirely from existing primitives, with inline validation
  before any network call, a double-guarded submit, and mapped error messages per failure.
  `describeAuthError` maps Supabase **error codes** — taken from the `ErrorCode` union in
  `@supabase/auth-js@2.111.0` — and never falls back to a raw library string.
- Three route gates in sequence: session, then onboarding, then the app. Each stage is unmounted
  rather than hidden, which is what makes hardware back exit instead of leaking the stage behind
  it. See ADR-014.
- Onboarding completion persisted per account, keyed by user id, so the session surviving a
  restart no longer means replaying a four-step flow. See ADR-013.
- A real sign out, confirmed before acting, and a Profile header showing the actual signed-in
  account instead of a fixture identity.

Verified on a physical Android device in Expo Go, in three runs:

- **Run 1 (M4.1–M4.3):** the app boots with the client constructed and the session provider
  mounted.
- **Run 2 (M4.4–M4.5), 31 steps:** cold start lands on sign-in; validation fires before any
  request; sign-up on the confirm-email-OFF branch; onboarding; **force-quit and reopen keeps the
  session and does not replay onboarding**; real email on Profile; sign out with confirmation;
  sign back in with onboarding intact; wrong password; airplane mode; duplicate email; hardware
  back exits at every gate; maximum system font size.
- **Run 3 (two accounts), 20 steps:** account A signs out without a force-quit, account B signs
  up on the same running app and gets onboarding from step 1, **B sees none of A's goal, email or
  interests**, and A's own onboarding survives B having used the device. Rapid double-taps on both
  Sign in and Create account produce exactly one request.

Run 3 existed because the cross-account clearing in `SessionGoalProvider` and the per-user key in
`features/onboarding/storage.ts` were written for a case no test had ever run. LEARNINGS records
that an unexecuted test suite is not evidence of anything; the same applies to app code.

Also fixed, found by review rather than by the device: `user_not_found` now returns the same
message as `invalid_credentials`, because a distinct "no account uses that email" reply is a
membership oracle. See SECURITY.md.

Constraints held: no `android/` or `ios/` directory, no prebuild, Expo Go preserved. Two runtime
packages added, both gated — see DEPENDENCIES.

### Test coverage, stated honestly

TEST_MATRIX's "Auth/data milestone" list is not fully satisfied by M4, and recording that is
better than implying otherwise.

| Row | Status |
|---|---|
| Two users | Covered — run 3 |
| Logged-out access | Covered — hardware back exits at every gate |
| Duplicate submit | Covered — run 3, rapid double-tap on both forms |
| Offline/reconnect | Covered — airplane mode on sign-in |
| Expired session | **Not covered.** No way to force expiry by hand. M6, with the refresh path |
| Unauthorized row access | **Not applicable yet.** The app reads no rows. The database side is already covered by pgTAP `004`; the app side lands in M5a |

Intentional limitation: the created goal is still session-only and vanishes on restart. That is
ADR-005 behaving as designed, not a defect, and M5a is what replaces it.

## M5a: real goals, actions and check-ins — complete (2026-08-02)

The milestone that made the app keep things. Nothing had ever survived a restart before this.

Delivered:

- Database types generated from `max-dev` and committed, so a wrong column name is a compile
  error rather than a 400 at runtime.
- Onboarding answers and timezone written to `profiles`. The device record stays as the route
  guard's fast path — synchronous, so a cold start picks a screen without a request, and correct
  offline — while the row is the source of truth, reconciled in both directions after sign-in.
- Goals created, read and archived. `SessionGoalProvider` retired: the isolation guarantee it
  hand-rolled moved to `goals_select_own`, where the database enforces it.
- Daily actions generated lazily per day, seeded once into `goal_actions` and read from the table
  after that. Completion is `completed_at`, toggled optimistically with a rollback.
- Real check-ins, one per goal per local day, with the uniqueness constraint doing the work
  rather than a pre-flight check.
- Three hooks on the `loading | ready | error` union ADR-009 fixed in M1e — the first time that
  shape has produced a reachable error branch. See ADR-015 and ADR-016.

Verified on a physical Android device in Expo Go, in three runs:

- **Run 1, profile:** a fresh account's answers reached the server and read back after a
  force-quit; an M4-era account's answers were pushed up by the reconcile on first launch;
  offline produced a real error with a working retry.
- **Run 2, goals:** a goal survived a force-quit — the step every previous milestone failed.
  Double-tapping Confirm created one goal, not two. Archiving offline failed loudly and left the
  goal intact, rather than the app believing a write that never happened.
- **Run 3, actions, check-ins and two accounts:** ticks and the check-in both survived a
  force-quit; an offline tick visibly rolled back; **a second account saw its own empty Today and
  none of the first account's rows**, and the first account was untouched afterwards.

Measured server-side after run 3, rather than inferred from the screen: 6 action rows across 2
active goals with no duplicates against either uniqueness constraint, and zero `goal_actions` or
`check_ins` whose `user_id` differs from their parent goal's owner.

**Test coverage:** this closes the "unauthorized row access" row that M4 recorded as not yet
applicable. **Expired-session behaviour remains uncovered** and still lands in M6.

Constraints held: no dependencies added, no `android/` or `ios/` directory, no prebuild, Expo Go
preserved. No schema change was needed — the M3 schema fit as designed.

Known limitations, both deliberate: the local date is captured when a load runs, so an app left
in the foreground across midnight keeps writing to the previous day; and a failed background
write is not retried until the next launch. Both belong to M6.

## M5b: Insights on real data

Streaks, weekly bars and achievements derived from the rows M5a produces, replacing the labelled
sample data of ADR-009. Profile achievements are the last fixture left in the app.

## M6: caching and offline handling

## M7: optional images

## M8: AI features

## M9: private squads

## M10: development build and notifications

## M11: shareable Android APK

## Deferred

- iPhone Expo Go review when a device is available. The highest-value check is SF Symbols:
  `icon-symbol.ios.tsx` passes names straight to `SymbolView`, which renders blank rather than
  failing when a name is wrong.
- Prune the packages the M1e demo removal orphaned (`expo-web-browser`, `expo-image`).

M6 onward are planned just in time, only when the preceding milestone is verified.
