import { currentWeekOf } from '@/features/insights/progress';
import { computeStreaks } from '@/features/insights/streaks';
import type {
  CheckInEntry,
  DayCompletion,
  GoalProgress,
  InsightsSnapshot,
} from '@/features/insights/types';
import { localDateString, shiftDate, weekdayLabel } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

/**
 * Everything Insights renders, assembled from four queries.
 *
 * Aggregated on the client rather than in a view or an RPC, for the reason
 * ADR-015 gave: M5 adds no new machinery, and a database function would put
 * derivation logic in SQL where every change becomes a migration. The bounds
 * below are what make that acceptable — none of these queries is unbounded, and
 * the largest grows with a single goal's duration rather than with total usage.
 */

export type InsightsResult =
  | { ok: true; snapshot: InsightsSnapshot }
  | { ok: false; message: string };

const LOAD_FAILED = 'Could not load your insights. Check your connection and try again.';

/** Covers the seven-day chart and the ratios beside the five recent check-ins. */
const RECENT_WINDOW_DAYS = 30;

const RECENT_CHECK_IN_LIMIT = 5;

export async function fetchInsights(userId: string): Promise<InsightsResult> {
  const today = localDateString();
  const windowStart = shiftDate(today, -(RECENT_WINDOW_DAYS - 1));

  // One row per goal per day. Bounded by how long the account has been used,
  // and the payload is three short columns.
  const checkIns = await supabase
    .from('check_ins')
    .select('id, check_in_date, note')
    .eq('user_id', userId)
    .order('check_in_date', { ascending: false });

  // Bounded by the window: at most 30 days x 3 actions x active goals.
  const recentActions = await supabase
    .from('goal_actions')
    .select('scheduled_date, completed_at')
    .eq('user_id', userId)
    .gte('scheduled_date', windowStart)
    .lte('scheduled_date', today);

  // `status` and `difficulty` are deliberately not selected: neither is rendered
  // here, and fetching a CHECK-constrained column would mean narrowing it at
  // this boundary too for no reader.
  const goals = await supabase
    .from('goals')
    .select('id, title, duration_weeks, start_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (checkIns.error || recentActions.error || goals.error) {
    return { ok: false, message: LOAD_FAILED };
  }

  // Bounded by goal duration: a 12-week goal tops out around 252 rows, and only
  // for days actually opened. Skipped entirely when nothing is active.
  const goalIds = goals.data.map((goal) => goal.id);
  const goalActions = goalIds.length
    ? await supabase
        .from('goal_actions')
        .select('goal_id, completed_at')
        .eq('user_id', userId)
        .in('goal_id', goalIds)
    : { data: [], error: null };

  if (goalActions.error) {
    return { ok: false, message: LOAD_FAILED };
  }

  const checkInDates = checkIns.data.map((row) => row.check_in_date);
  const streaks = computeStreaks(checkInDates, today);

  return {
    ok: true,
    snapshot: {
      week: buildWeek(recentActions.data, today),
      currentStreakDays: streaks.current,
      longestStreakDays: streaks.longest,
      goals: buildGoalProgress(goals.data, goalActions.data, today),
      recentCheckIns: buildRecentCheckIns(checkIns.data, recentActions.data),
    },
  };
}

type ActionDateRow = { scheduled_date: string; completed_at: string | null };

/**
 * Seven entries ending today, oldest first.
 *
 * Every day in the range gets an entry even when it has no actions, so the chart
 * always has seven bars and an unopened day is visibly empty rather than absent.
 */
function buildWeek(actions: ActionDateRow[], today: string): DayCompletion[] {
  const week: DayCompletion[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset);
    const forDay = actions.filter((action) => action.scheduled_date === date);

    week.push({
      key: date,
      label: weekdayLabel(date),
      completed: forDay.filter((action) => action.completed_at !== null).length,
      total: forDay.length,
    });
  }
  return week;
}

type GoalRow = {
  id: string;
  title: string;
  duration_weeks: number;
  start_date: string;
};

function buildGoalProgress(
  goals: GoalRow[],
  actions: { goal_id: string; completed_at: string | null }[],
  today: string
): GoalProgress[] {
  return goals.map((goal) => {
    const mine = actions.filter((action) => action.goal_id === goal.id);

    return {
      id: goal.id,
      title: goal.title,
      currentWeek: currentWeekOf(goal.start_date, today, goal.duration_weeks),
      totalWeeks: goal.duration_weeks,
      completedActions: mine.filter((action) => action.completed_at !== null).length,
      totalActions: mine.length,
    };
  });
}

function buildRecentCheckIns(
  checkIns: { id: string; check_in_date: string; note: string | null }[],
  actions: ActionDateRow[]
): CheckInEntry[] {
  return checkIns.slice(0, RECENT_CHECK_IN_LIMIT).map((checkIn) => {
    const forDay = actions.filter((action) => action.scheduled_date === checkIn.check_in_date);

    return {
      id: checkIn.id,
      date: checkIn.check_in_date,
      note: checkIn.note,
      actionsCompleted: forDay.filter((action) => action.completed_at !== null).length,
      // Zero when the check-in predates the fetched window. The row renders
      // without a ratio rather than claiming "0 of 0".
      actionsTotal: forDay.length,
    };
  });
}

/** The three Profile achievement figures, from the same rows. */
export type Achievements = {
  longestStreakDays: number;
  checkInCount: number;
  goalsCompleted: number;
};

export type AchievementsResult =
  | { ok: true; achievements: Achievements }
  | { ok: false; message: string };

export async function fetchAchievements(userId: string): Promise<AchievementsResult> {
  const checkIns = await supabase
    .from('check_ins')
    .select('check_in_date')
    .eq('user_id', userId);

  // `head: true` transfers no rows — only the count.
  const completed = await supabase
    .from('goals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (checkIns.error || completed.error) {
    return { ok: false, message: 'Could not load your achievements. Check your connection.' };
  }

  const dates = checkIns.data.map((row) => row.check_in_date);

  return {
    ok: true,
    achievements: {
      longestStreakDays: computeStreaks(dates, localDateString()).longest,
      // Distinct days, so two goals checked in on one day counts once — the same
      // rule the streak uses, rather than a second definition of a check-in.
      checkInCount: new Set(dates).size,
      goalsCompleted: completed.count ?? 0,
    },
  };
}
