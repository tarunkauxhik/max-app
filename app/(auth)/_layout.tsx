import { Stack } from 'expo-router';

/**
 * The anchor is declared here at creation time rather than after a device test
 * finds it missing. LEARNINGS records the M1c defect: a group with no declared
 * anchor has no defined initial route, so it opens on whichever screen the
 * route tree happens to order first, and Back then throws `GO_BACK` because
 * that screen genuinely is the first stack entry.
 *
 * There is deliberately no `index.tsx` here. Route groups contribute no URL
 * segment, so `app/(auth)/index.tsx` and `app/(tabs)/index.tsx` would both
 * resolve to `/` — the generated route types confirmed both claiming it. Only
 * one is ever mounted, so nothing breaks immediately, but it leaves `/`
 * meaning two different screens depending on session state, and a later
 * `router.replace('/')` after sign-in could land back on the sign-in screen.
 * Naming the file `sign-in` removes the ambiguity rather than documenting it.
 *
 * Sign-in is the anchor rather than sign-up because after the first launch,
 * returning users outnumber new ones, and either is one tap from the other.
 */
export const unstable_settings = {
  anchor: 'sign-in',
};

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
