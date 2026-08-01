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

## M1b: remaining design-foundation work

- Product flow for onboarding and Today.
- iPhone Expo Go review when a device is available.

## M2: navigation and static flows

- Onboarding.
- Auth screens without backend.
- Goal creation flow.
- Loading, empty and error states.

## M3+: just-in-time planning

Backend, persistence, auth, caching, AI, images, reminders, squads and native builds are planned only when the preceding milestone is verified.
