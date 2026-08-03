import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { WeekBars } from '@/components/ui/week-bars';
import { Spacing } from '@/constants/tokens';
import {
  completeDayCount,
  plannedDayCount,
  type InsightsSnapshot,
} from '@/features/insights/types';
import { useInsights } from '@/features/insights/use-insights';
import { useTheme } from '@/hooks/use-theme';
import { longDateLabel } from '@/lib/dates';

function InsightsLoading() {
  return (
    <View accessible accessibilityLabel="Loading insights" style={styles.sections}>
      <Card>
        <Skeleton height={20} width="40%" />
        <Skeleton height={72} />
        <Skeleton height={14} width="55%" />
      </Card>
      <Card>
        <Skeleton height={20} width="30%" />
        <Skeleton height={44} />
      </Card>
      <Card>
        <Skeleton height={20} width="45%" />
        <Skeleton height={44} />
      </Card>
    </View>
  );
}

function InsightsContent({ data }: { data: InsightsSnapshot }) {
  const colors = useTheme();

  const complete = completeDayCount(data.week);
  const planned = plannedDayCount(data.week);
  const isEmpty = data.goals.length === 0 && data.recentCheckIns.length === 0;

  /*
    "of 7" would count days the app was never opened as failures. Actions are
    seeded lazily (ADR-016), so a day with no plan is not a missed day — the
    denominator is days that had one.
  */
  const weekSummary =
    planned === 0
      ? 'No actions planned in the last seven days'
      : `${complete} of ${planned} planned ${planned === 1 ? 'day' : 'days'} complete`;

  return (
    <View style={styles.sections}>
      <Card>
        <Text variant="heading">This week</Text>
        <WeekBars days={data.week} summary={weekSummary} />
      </Card>

      <Card>
        <Text variant="heading">Streak</Text>
        <View style={styles.tiles}>
          <StatTile value={String(data.currentStreakDays)} label="Current streak" />
          <StatTile value={String(data.longestStreakDays)} label="Longest streak" />
        </View>
      </Card>

      {isEmpty ? (
        <View style={styles.section}>
          <EmptyState
            title="No goals yet"
            body="Create a goal and your progress and check-ins will show up here."
          />
          <Button label="Create a goal" onPress={() => router.push('/goal/name')} />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text variant="heading">Goal progress</Text>
            <Card style={styles.list}>
              {data.goals.map((goal, index) => (
                <View key={goal.id}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  ) : null}
                  <View style={styles.listRow}>
                    <Text variant="bodyStrong">{goal.title}</Text>
                    <Text variant="caption" tone="muted">
                      Week {goal.currentWeek} of {goal.totalWeeks}
                    </Text>
                    <ProgressBar
                      value={goal.completedActions}
                      max={goal.totalActions}
                      label={`${goal.completedActions} of ${goal.totalActions} actions complete`}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </View>

          <View style={styles.section}>
            <Text variant="heading">Recent check-ins</Text>
            <Card style={styles.list}>
              {data.recentCheckIns.map((checkIn, index) => (
                <View key={checkIn.id}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  ) : null}
                  <View
                    accessible
                    accessibilityLabel={[
                      longDateLabel(checkIn.date),
                      checkIn.actionsTotal > 0
                        ? `${checkIn.actionsCompleted} of ${checkIn.actionsTotal} actions complete.`
                        : null,
                      checkIn.note ?? 'No note.',
                    ]
                      .filter(Boolean)
                      .join('. ')}
                    style={styles.listRow}>
                    <View style={styles.checkInHeader}>
                      <Text variant="bodyStrong" style={styles.checkInDate}>
                        {longDateLabel(checkIn.date)}
                      </Text>
                      {/*
                        Hidden rather than shown as 0/0 when the check-in falls
                        outside the fetched window of actions — an absent ratio
                        is honest, a zero one is a claim.
                      */}
                      {checkIn.actionsTotal > 0 ? (
                        <Text variant="caption" tone="muted">
                          {checkIn.actionsCompleted}/{checkIn.actionsTotal}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="caption" tone={checkIn.note ? 'secondary' : 'muted'}>
                      {checkIn.note ?? 'No note written.'}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        </>
      )}
    </View>
  );
}

export default function InsightsScreen() {
  const state = useInsights();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            Insights
          </Text>
          <Text variant="caption" tone="muted">
            Your last seven days
          </Text>
        </View>

        {state.status === 'loading' ? <InsightsLoading /> : null}

        {state.status === 'error' ? (
          <Card>
            <Text variant="body" tone="secondary">
              {state.message}
            </Text>
            <Button label="Try again" variant="secondary" onPress={state.retry} />
          </Card>
        ) : null}

        {state.status === 'ready' ? <InsightsContent data={state.data} /> : null}
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
  sections: {
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  list: {
    gap: 0,
    paddingVertical: Spacing.xs,
  },
  listRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkInDate: {
    flex: 1,
  },
});
