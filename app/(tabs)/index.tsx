import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { useSessionGoal } from '@/features/goals/state';
import { difficultyLabel } from '@/features/goals/types';
import { todayMock } from '@/features/today/mock-data';
import { useTheme } from '@/hooks/use-theme';

export default function TodayScreen() {
  const colors = useTheme();
  const { goal, clearGoal } = useSessionGoal();
  const { goalTitle, streakDays, actions } = todayMock;

  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);

  const toggle = useCallback((id: string) => {
    setCheckedIn(false);
    setCompletedIds((previous) =>
      previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id]
    );
  }, []);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const completed = completedIds.length;
  const total = actions.length;
  const allComplete = total > 0 && completed === total;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="display">Today</Text>
          <Text variant="caption" tone="muted">
            {today}
          </Text>
        </View>

        {goal ? (
          <Card>
            <Text variant="caption" tone="muted">
              Created this session
            </Text>
            <Text variant="heading">{goal.title}</Text>
            <Text variant="body" tone="secondary">
              {goal.minutesPerDay} minutes a day, {goal.durationWeeks} weeks,{' '}
              {difficultyLabel(goal.difficulty).toLowerCase()} pace
            </Text>
            <Button label="Clear" variant="ghost" onPress={clearGoal} />
          </Card>
        ) : (
          <Button
            label="Create a goal"
            variant="secondary"
            onPress={() => router.push('/goal/name')}
          />
        )}

        {total === 0 ? (
          <EmptyState
            title="Nothing planned yet"
            body="When you add a goal, today's actions will appear here."
          />
        ) : (
          <>
            <Card>
              <Text variant="heading">{goalTitle}</Text>
              <ProgressBar
                value={completed}
                max={total}
                label={`${completed} of ${total} actions complete`}
              />
              <Text variant="caption" tone="streak">
                {streakDays}-day streak
              </Text>
            </Card>

            <View style={styles.section}>
              <Text variant="heading">Actions</Text>
              <Card style={styles.actions}>
                {actions.map((action, index) => (
                  <View key={action.id}>
                    {index > 0 ? (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    ) : null}
                    <ActionRow
                      title={action.title}
                      note={action.note}
                      completed={completedIds.includes(action.id)}
                      onToggle={() => toggle(action.id)}
                    />
                  </View>
                ))}
              </Card>
            </View>

            <View style={styles.section}>
              <Button
                label={checkedIn ? 'Checked in' : 'Check in for today'}
                onPress={() => setCheckedIn(true)}
                disabled={!allComplete || checkedIn}
                accessibilityHint={
                  allComplete ? undefined : 'Complete every action to enable check in'
                }
              />
              {checkedIn ? (
                <Text variant="caption" tone="success">
                  Saved for this session only. Nothing is stored yet.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
  },
  section: {
    gap: Spacing.md,
  },
  actions: {
    gap: 0,
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
