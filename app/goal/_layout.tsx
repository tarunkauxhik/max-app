import { Stack } from 'expo-router';

import { GoalDraftProvider } from '@/features/goals/state';
import { useTheme } from '@/hooks/use-theme';

/**
 * The provider sits above the Stack so it stays mounted while the user moves
 * between steps. That is what preserves input on backward navigation.
 */
export default function GoalLayout() {
  const colors = useTheme();

  return (
    <GoalDraftProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="name" options={{ title: 'New goal' }} />
        <Stack.Screen name="time" options={{ title: 'Daily time' }} />
        <Stack.Screen name="plan" options={{ title: 'Duration and effort' }} />
        <Stack.Screen name="review" options={{ title: 'Review' }} />
      </Stack>
    </GoalDraftProvider>
  );
}
