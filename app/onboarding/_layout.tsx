import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/features/onboarding/state';

/**
 * Pin the entry point explicitly. `index.tsx` alone is usually enough, but
 * stating the anchor makes the initial route deterministic rather than
 * dependent on route-tree ordering.
 */
export const unstable_settings = {
  anchor: 'index',
};

/**
 * The provider sits above the Stack so it stays mounted while the user moves
 * between steps. That is what preserves selections on backward navigation.
 *
 * Headers are hidden: `OnboardingStep` supplies the chrome, and each step
 * offers an explicit Back button so the flow does not depend on a hardware
 * button or a swipe gesture.
 */
export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingDraftProvider>
  );
}
