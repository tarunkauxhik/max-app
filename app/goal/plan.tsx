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
import { DIFFICULTY_OPTIONS, WEEKS_OPTIONS, type Difficulty } from '@/features/goals/types';
import { useTheme } from '@/hooks/use-theme';

export default function GoalPlanScreen() {
  const colors = useTheme();
  const { draft, update } = useGoalDraft();
  const [showErrors, setShowErrors] = useState(false);

  const durationError = draft.durationWeeks === null ? 'Choose a duration' : null;
  const difficultyError = draft.difficulty === null ? 'Choose a difficulty' : null;

  function handleContinue() {
    if (durationError || difficultyError) {
      setShowErrors(true);
      return;
    }
    router.push('/goal/review');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar value={3} max={4} label="Step 3 of 4" />
        <Text variant="title" accessibilityRole="header">
          How long, and how hard?
        </Text>

        <OptionGroup
          label="Duration"
          options={WEEKS_OPTIONS}
          value={draft.durationWeeks}
          onChange={(durationWeeks) => update({ durationWeeks })}
          error={showErrors ? durationError : null}
        />

        <OptionGroup
          label="Difficulty"
          layout="stack"
          options={DIFFICULTY_OPTIONS}
          value={draft.difficulty}
          onChange={(difficulty: Difficulty) => update({ difficulty })}
          error={showErrors ? difficultyError : null}
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
