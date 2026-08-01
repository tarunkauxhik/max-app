import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { OptionGroup } from '@/components/ui/option-group';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { useGoalDraft } from '@/features/goals/state';
import { MINUTES_OPTIONS } from '@/features/goals/types';
import { useTheme } from '@/hooks/use-theme';

export default function GoalTimeScreen() {
  const colors = useTheme();
  const { draft, update } = useGoalDraft();
  const [showError, setShowError] = useState(false);

  const error = draft.minutesPerDay === null ? 'Choose how much time you have' : null;

  function handleContinue() {
    if (error) {
      setShowError(true);
      return;
    }
    router.push('/goal/plan');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar value={2} max={4} label="Step 2 of 4" />
        <Text variant="title">How much time do you have each day?</Text>
        <OptionGroup
          label="Daily time"
          options={MINUTES_OPTIONS}
          value={draft.minutesPerDay}
          onChange={(minutesPerDay) => {
            update({ minutesPerDay });
            setShowError(false);
          }}
          error={showError ? error : null}
        />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button label="Continue" onPress={handleContinue} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
