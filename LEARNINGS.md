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
