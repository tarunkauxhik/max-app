import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/tokens';
import { useAuth } from '@/features/auth/state';
import { archiveGoal, completeGoal } from '@/features/goals/api';
import { useActiveGoal } from '@/features/goals/use-active-goal';
import { difficultyLabel, type Goal } from '@/features/goals/types';
import {
  NOTE_COUNTER_THRESHOLD,
  NOTE_MAX_LENGTH,
  validateNote,
} from '@/features/today/actions';
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

  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState('');
  const { state, writeError, dismissWriteError, toggleAction, checkIn, checkingIn } =
    useToday(goal);

  const noteError = validateNote(note);

  const actions = state.status === 'ready' ? state.actions : [];
  const checkedIn = state.status === 'ready' && state.checkedIn;

  const completed = actions.filter((action) => action.completedAt !== null).length;
  const total = actions.length;
  const allComplete = total > 0 && completed === total;

  /**
   * Both lifecycle endings, confirmed before acting.
   *
   * Neither is reversible in this app — nothing lists archived or completed
   * goals, let alone restores them — so from the user's side both are permanent,
   * and a mis-tap on a scrolling screen should not end a twelve-week goal.
   *
   * They are distinguished by wording, not by colour: finishing a goal is an
   * achievement and archiving is filing away something unfinished, so only the
   * second is styled destructive.
   */
  function confirmEnding(kind: 'complete' | 'archive') {
    if (lifecycleBusy || !user) {
      return;
    }

    const completing = kind === 'complete';

    Alert.alert(
      completing ? 'Mark this goal complete?' : 'Archive this goal?',
      completing
        ? `"${goal.title}" will move out of Today and count towards your finished goals.`
        : `"${goal.title}" will be removed from Today without counting as finished.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: completing ? 'Mark complete' : 'Archive',
          style: completing ? 'default' : 'destructive',
          onPress: () => {
            setLifecycleBusy(true);
            const run = completing ? completeGoal : archiveGoal;

            void run(goal.id, user.id).then((result) => {
              setLifecycleBusy(false);
              if (result.ok) {
                onArchived();
              } else {
                Alert.alert(completing ? 'Complete goal' : 'Archive goal', result.message);
              }
            });
          },
        },
      ]
    );
  }

  function submitCheckIn() {
    if (noteError) {
      return;
    }
    checkIn(note);
    setComposing(false);
    setNote('');
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
        {/*
          The note is optional, so composing is a step the user opts into rather
          than a form standing between them and the check-in. Tapping the button
          reveals it; Save with an empty field is a valid check-in.
        */}
        {composing && !checkedIn ? (
          <Card>
            <TextField
              label="How did it go?"
              hint="Optional. This is what you will read back on Insights."
              placeholder="A line about today…"
              value={note}
              onChangeText={setNote}
              error={noteError}
              multiline
              maxLength={NOTE_MAX_LENGTH}
              autoFocus
            />
            {note.length >= NOTE_COUNTER_THRESHOLD ? (
              <Text variant="caption" tone="muted">
                {NOTE_MAX_LENGTH - note.length} characters left
              </Text>
            ) : null}
            <Button
              label={checkingIn ? 'Checking in…' : 'Save check-in'}
              onPress={submitCheckIn}
              disabled={checkingIn || noteError !== null}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setComposing(false);
                setNote('');
              }}
              disabled={checkingIn}
            />
          </Card>
        ) : (
          <Button
            label={checkedIn ? 'Checked in' : 'Check in for today'}
            onPress={() => setComposing(true)}
            disabled={!allComplete || checkedIn || checkingIn}
            accessibilityHint={
              allComplete ? 'Opens a note to save with your check-in' : 'Complete every action to enable check in'
            }
          />
        )}

        {checkedIn ? (
          <Text variant="caption" tone="success">
            Saved. Your streak counts this day.
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Button
          label={lifecycleBusy ? 'Saving…' : 'Mark goal complete'}
          variant="secondary"
          onPress={() => confirmEnding('complete')}
          disabled={lifecycleBusy}
          accessibilityHint="Finishes this goal and counts it towards your achievements."
        />
        <Button
          label="Archive goal"
          variant="ghost"
          onPress={() => confirmEnding('archive')}
          disabled={lifecycleBusy}
          accessibilityHint="Removes this goal from Today without counting it as finished."
        />
      </View>
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
      {/*
        Today gained a text field in M5b, so it needs the same keyboard handling
        the auth and goal-name screens already use. `keyboardShouldPersistTaps`
        matters here specifically: without it, the first tap on Save check-in
        only dismisses the keyboard and the user has to press twice.
      */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            // Keyed by goal id so ending one and creating another starts with
            // fresh completion state rather than inheriting the previous goal's.
            <GoalContent key={state.goal.id} goal={state.goal} onArchived={reload} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
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
