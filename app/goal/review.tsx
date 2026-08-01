import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { useGoalDraft, useSessionGoal } from '@/features/goals/state';
import { difficultyLabel, validateTitle } from '@/features/goals/types';
import { useTheme } from '@/hooks/use-theme';

type SummaryRowProps = {
  label: string;
  value: string;
  editHref: '/goal/name' | '/goal/time' | '/goal/plan';
};

function SummaryRow({ label, value, editHref }: SummaryRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
      <Button
        label="Edit"
        variant="ghost"
        accessibilityLabel={`Edit ${label.toLowerCase()}`}
        onPress={() => router.dismissTo(editHref)}
      />
    </View>
  );
}

export default function GoalReviewScreen() {
  const colors = useTheme();
  const { draft } = useGoalDraft();
  const { saveGoal } = useSessionGoal();

  const missing: string[] = [];
  if (validateTitle(draft.title)) {
    missing.push('a goal');
  }
  if (draft.minutesPerDay === null) {
    missing.push('daily time');
  }
  if (draft.durationWeeks === null) {
    missing.push('a duration');
  }
  if (draft.difficulty === null) {
    missing.push('a difficulty');
  }
  const ready = missing.length === 0;

  function handleConfirm() {
    saveGoal(draft);
    router.dismissTo('/');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar value={4} max={4} label="Step 4 of 4" />
        <Text variant="title">Does this look right?</Text>

        <Card style={styles.summary}>
          <SummaryRow label="Goal" value={draft.title.trim() || 'Not set'} editHref="/goal/name" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow
            label="Daily time"
            value={draft.minutesPerDay === null ? 'Not set' : `${draft.minutesPerDay} minutes a day`}
            editHref="/goal/time"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow
            label="Duration"
            value={draft.durationWeeks === null ? 'Not set' : `${draft.durationWeeks} weeks`}
            editHref="/goal/plan"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow
            label="Difficulty"
            value={draft.difficulty === null ? 'Not set' : difficultyLabel(draft.difficulty)}
            editHref="/goal/plan"
          />
        </Card>

        <Text variant="caption" tone="muted">
          Confirming keeps this goal for the current session only. Nothing is saved to a device
          or a server yet.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          label="Confirm goal"
          onPress={handleConfirm}
          disabled={!ready}
          accessibilityHint={ready ? undefined : `Still needs ${missing.join(', ')}`}
        />
        {ready ? null : (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            Still needs {missing.join(', ')}.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  summary: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
});
