import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SessionGoalProvider } from '@/features/goals/state';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/state';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Split out so it can read onboarding state from the provider above it.
 *
 * The guards mean the tab tree is not mounted at all until onboarding is
 * passed, so hardware back on the first onboarding screen exits the app rather
 * than revealing Today behind the gate.
 */
function RootStack() {
  const { completed } = useOnboarding();

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
    <OnboardingProvider>
      <SessionGoalProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootStack />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SessionGoalProvider>
    </OnboardingProvider>
  );
}
