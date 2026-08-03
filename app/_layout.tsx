import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, type ReactNode } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/state';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/state';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Held at module scope so the native splash is still up before React renders
// anything. Reading the stored session is fast but not instant, and the
// alternative is a blank frame or a flash of the wrong screen.
void SplashScreen.preventAutoHideAsync();

/**
 * Empties the query cache when the account behind it changes.
 *
 * The cache sits above the session gate, so signing out unmounts every screen
 * but leaves what they fetched in memory — and, from M6b, on disk. This is the
 * same hazard `SessionGoalProvider` had in M5a, one layer up, and it is worse
 * here because a cache holds goal titles and check-in notes rather than a single
 * goal.
 *
 * **Only clears on a transition away from a signed-in account.** Clearing
 * whenever the id changes would also fire on the first render after a restored
 * session — `null` to a real id — which would throw away the persisted cache
 * M6b is about to add, on every launch.
 *
 * The one-frame window where a *different* account is signed in but the old
 * entries have not been dropped yet is why `queryKeys` embeds the user id:
 * the new account's keys simply miss and refetch.
 */
function CacheBoundary({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (previousUserId.current !== null && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [userId]);

  return children;
}

/**
 * Split out so it can read onboarding state from the provider above it.
 *
 * The guards mean the tab tree is not mounted at all until onboarding is
 * passed, so hardware back on the first onboarding screen exits the app rather
 * than revealing Today behind the gate.
 */
function RootStack() {
  const { completed } = useOnboarding();
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  // The splash is covering this, so there is nothing to render yet.
  if (status === 'loading') {
    return null;
  }

  // Three gates in sequence: session, then onboarding, then the app. Each tree
  // is not merely hidden but unmounted, which is what makes hardware back
  // behave — on the first screen of a gate there is nothing behind it to
  // reveal, so back exits rather than leaking the previous stage.
  //
  // Signing out flips `status` and the whole authenticated tree unmounts, so
  // there is no path that leaves a stale screen holding another account's data.
  return (
    <Stack>
      <Stack.Protected guard={status === 'signed-out'}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'signed-in' && !completed}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'signed-in' && completed}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="goal" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // The query client wraps everything, including AuthProvider, because
    // `OnboardingProvider` reconciles the profile row and will read through the
    // cache too. `CacheBoundary` sits inside AuthProvider because it has to
    // watch the session it is protecting against.
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CacheBoundary>
          <OnboardingProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <RootStack />
              <StatusBar style="auto" />
            </ThemeProvider>
          </OnboardingProvider>
        </CacheBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
