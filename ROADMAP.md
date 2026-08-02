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

## M1e: static integration and UX audit — in progress

The first milestone to treat the app as one product rather than four screens. Implemented;
pending Android device verification.

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

Remaining: Android physical-device pass, then commit.

## M1f: remaining design-foundation work

- iPhone Expo Go review when a device is available. The highest-value check is SF Symbols:
  `icon-symbol.ios.tsx` passes names straight to `SymbolView`, which renders blank rather than
  failing when a name is wrong.
- Prune the packages the demo removal orphaned (`expo-web-browser`, `expo-image`), which needs
  a `package.json` change and its own approval.

## M2: navigation and static flows

Onboarding and goal creation shipped early, in M1c and M1b. Remaining:

- Auth screens without backend.
- Error and retry states for the flows that will later call a backend.

## M3+: just-in-time planning

Backend, persistence, auth, caching, AI, images, reminders, squads and native builds are planned only when the preceding milestone is verified.
