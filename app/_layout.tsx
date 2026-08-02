import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/state';
import { SessionGoalProvider } from '@/features/goals/state';
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

  return (
    <Stack>
      <Stack.Protected guard={!completed}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={completed}>
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
        <SessionGoalProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootStack />
            <StatusBar style="auto" />
          </ThemeProvider>
        </SessionGoalProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
