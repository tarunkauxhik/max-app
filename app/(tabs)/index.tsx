import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { useAuth } from '@/features/auth/state';
import { archiveGoal } from '@/features/goals/api';
import { useActiveGoal } from '@/features/goals/use-active-goal';
import { difficultyLabel, type Goal } from '@/features/goals/types';
import { useToday } from '@/features/today/use-today';
import { useTheme } from '@/hooks/use-theme';

function TodayLoading() {
  return (
    <View accessible accessibilityLabel="Loading today" style={styles.section}>
      <Card>
        <Skeleton height={22} width="60%" />
        <Skeleton height={16} width="45%" />
        <Skeleton height={12} />
      </Card>
      <Card>
        <Skeleton height={44} />
        <Skeleton height={44} />
      </Card>
    </View>
  );
}

/**
 * The goal, its actions and the check-in.
 *
 * Split out from the screen so the loading and error branches do not have to
 * carry the hooks this branch needs. Completion and check-in are still local
 * state — M5a.4 and M5a.5 move them into `goal_actions` and `check_ins`, and
 * until then the caption below says so rather than implying they are stored.
 */
function GoalContent({ goal, onArchived }: { goal: Goal; onArchived: () => void }) {
  const colors = useTheme();
  const { user } = useAuth();

  const [archiving, setArchiving] = useState(false);
  const { state, writeError, dismissWriteError, toggleAction, checkIn, checkingIn } =
    useToday(goal);

  const actions = state.status === 'ready' ? state.actions : [];
  const checkedIn = state.status === 'ready' && state.checkedIn;

  const completed = actions.filter((action) => action.completedAt !== null).length;
  const total = actions.length;
  const allComplete = total > 0 && completed === total;

  /**
   * Confirmed before acting, because there is no way back.
   *
   * Archiving is reversible in the schema but not in this app — nothing lists
   * archived goals or restores them — so from the user's side it is permanent,
   * and a mis-tap on a scrolling screen should not end a twelve-week goal.
   */
  function confirmArchive() {
    if (archiving || !user) {
      return;
    }

    Alert.alert(
      'Archive this goal?',
      `"${goal.title}" will be removed from Today. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            setArchiving(true);
            void archiveGoal(goal.id, user.id).then((result) => {
              setArchiving(false);
              if (result.ok) {
                onArchived();
              } else {
                Alert.alert('Archive goal', result.message);
              }
            });
          },
        },
      ]
    );
  }

  return (
    <>
      <Card>
        <Text variant="heading">{goal.title}</Text>
        <Text variant="body" tone="secondary">
          {goal.minutesPerDay} minutes a day, {goal.durationWeeks} weeks,{' '}
          {difficultyLabel(goal.difficulty).toLowerCase()} pace
        </Text>
        <ProgressBar
          value={completed}
          max={total}
          label={`${completed} of ${total} actions complete`}
        />
      </Card>

      <View style={styles.section}>
        <Text variant="heading">Actions</Text>

        {state.status === 'loading' ? (
          <Card accessible accessibilityLabel="Loading today's actions">
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </Card>
        ) : null}

        {state.status === 'error' ? (
          <Card>
            <Text variant="body" tone="secondary">
              {state.message}
            </Text>
            <Button label="Try again" variant="secondary" onPress={state.retry} />
          </Card>
        ) : null}

        {state.status === 'ready' ? (
          <Card style={styles.actions}>
            {actions.map((action, index) => (
              <View key={action.id}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                ) : null}
                <ActionRow
                  title={action.title}
                  note={action.note ?? undefined}
                  completed={action.completedAt !== null}
                  onToggle={() => toggleAction(action.id)}
                />
              </View>
            ))}
          </Card>
        ) : null}

        {/*
          A failed write, surfaced without an alert. The row has already rolled
          back, so this explains a tick that visibly undid itself rather than
          interrupting to demand acknowledgement of something already handled.
        */}
        {writeError ? (
          <Card>
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {writeError}
            </Text>
            <Button label="Dismiss" variant="ghost" onPress={dismissWriteError} />
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <Button
          label={checkingIn ? 'Checking in…' : checkedIn ? 'Checked in' : 'Check in for today'}
          onPress={checkIn}
          disabled={!allComplete || checkedIn || checkingIn}
          accessibilityHint={allComplete ? undefined : 'Complete every action to enable check in'}
        />
        {checkedIn ? (
          <Text variant="caption" tone="success">
            Saved. Your streak counts this day.
          </Text>
        ) : null}
      </View>

      <Button
        label={archiving ? 'Archiving…' : 'Archive goal'}
        variant="ghost"
        onPress={confirmArchive}
        disabled={archiving}
        accessibilityHint="Removes this goal from Today. This cannot be undone."
      />
    </>
  );
}

export default function TodayScreen() {
  const { state, reload } = useActiveGoal();

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            Today
          </Text>
          <Text variant="caption" tone="muted">
            {today}
          </Text>
        </View>

        {state.status === 'loading' ? <TodayLoading /> : null}

        {state.status === 'error' ? (
          <Card>
            <Text variant="body" tone="secondary">
              {state.message}
            </Text>
            <Button label="Try again" variant="secondary" onPress={state.retry} />
          </Card>
        ) : null}

        {state.status === 'ready' && state.goal === null ? (
          <View style={styles.section}>
            <EmptyState
              title="Nothing planned yet"
              body="Create a goal and today's actions will appear here."
            />
            <Button label="Create a goal" onPress={() => router.push('/goal/name')} />
          </View>
        ) : null}

        {state.status === 'ready' && state.goal !== null ? (
          // Keyed by goal id so archiving one and creating another starts with
          // fresh completion state rather than inheriting the previous goal's.
          <GoalContent key={state.goal.id} goal={state.goal} onArchived={reload} />
        ) : null}
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
