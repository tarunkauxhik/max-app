import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/state';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/state';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Held at module scope so the native splash is still up before React renders
// anything. Reading the stored session is fast but not instant, and the
// alternative is a blank frame or a flash of the wrong screen.
void SplashScreen.preventAutoHideAsync();

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
    <AuthProvider>
      <OnboardingProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootStack />
          <StatusBar style="auto" />
        </ThemeProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
