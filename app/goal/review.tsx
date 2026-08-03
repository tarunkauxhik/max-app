import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SummaryRow } from '@/components/ui/summary-row';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { useAuth } from '@/features/auth/state';
import { createGoal } from '@/features/goals/api';
import { useGoalDraft } from '@/features/goals/state';
import { difficultyLabel, validateTitle } from '@/features/goals/types';
import { useTheme } from '@/hooks/use-theme';

export default function GoalReviewScreen() {
  const colors = useTheme();
  const { draft } = useGoalDraft();
  const { user } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /**
   * The first write the user waits on.
   *
   * Unlike onboarding, this one cannot be optimistic. Onboarding had a device
   * record to fall back on and a reconcile to repair it later; a goal has
   * neither, so navigating away before the insert lands would show Today with no
   * goal and no explanation. The user stays here until the row exists.
   *
   * Guarded twice against a double tap, the same way `features/auth/auth-form.tsx`
   * is: a synchronous check plus a disabled button. A duplicate here would create
   * two goals, and there is no way in the UI to remove one.
   */
  async function handleConfirm() {
    if (busy || !user) {
      return;
    }

    setBusy(true);
    setError(null);

    const result = await createGoal(user.id, draft);

    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }

    // Not clearing `busy` on success: this screen is being dismissed, and
    // re-enabling the button first gives a brief window to press it again.
    router.dismissTo('/');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar value={4} max={4} label="Step 4 of 4" />
        <Text variant="title" accessibilityRole="header">
          Does this look right?
        </Text>

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
          Confirming saves this goal to your account. You can archive it later, but it cannot be
          deleted.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {error ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={busy ? 'Saving…' : 'Confirm goal'}
          onPress={() => void handleConfirm()}
          disabled={!ready || busy}
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
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
});
