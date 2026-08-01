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
- Root cause: `@react-navigation/bottom-tabs` renders `BottomTabView` inside `SafeAreaProviderCompat`, which supplies a provider when none exists above it.
- Verified fix: none needed. `components/ui/screen.tsx` calls `useSafeAreaInsets` inside a tab route with no root provider, and the root layout was left unchanged.
- Test/evidence: `SafeAreaProviderCompat` confirmed in the installed `@react-navigation/bottom-tabs` `BottomTabView.js`; Android device pass.
- Should a rule or skill change be proposed? No. But re-check when the first screen outside the tab navigator is added — a stack pushed above the tabs may have no provider above it.
