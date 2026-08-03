export type DayCompletion = {
  /** The `YYYY-MM-DD` date, unique within a week and stable as a list key. */
  key: string;
  /** Short weekday label, e.g. "Mon". */
  label: string;
  completed: number;
  /**
   * Actions planned for that day. **Zero means nothing was planned**, not that
   * everything was missed — actions are seeded lazily on first open (ADR-016),
   * so a day the app was never opened has none.
   */
  total: number;
};

export type GoalProgress = {
  id: string;
  title: string;
  currentWeek: number;
  totalWeeks: number;
  completedActions: number;
  /**
   * Actions planned **so far**, not a projection to the end of the goal. A
   * projected total would have to assume three actions every day for the whole
   * duration, which is a client guess that M8's planner breaks.
   */
  totalActions: number;
};

export type CheckInEntry = {
  id: string;
  /** The `YYYY-MM-DD` date; formatted for display at the point of rendering. */
  date: string;
  /** What distinguishes two check-ins made on the same day for different goals. */
  goalTitle: string | null;
  /** Null when the user saved a check-in without writing anything. */
  note: string | null;
  actionsCompleted: number;
  /** Zero when the day falls outside the window of actions fetched. */
  actionsTotal: number;
};

export type InsightsSnapshot = {
  /** Exactly seven entries, oldest first, ending today. */
  week: DayCompletion[];
  currentStreakDays: number;
  longestStreakDays: number;
  goals: GoalProgress[];
  recentCheckIns: CheckInEntry[];
};

/** A day counts as complete only when every action planned for it was finished. */
export function completeDayCount(week: DayCompletion[]): number {
  return week.filter((day) => day.total > 0 && day.completed === day.total).length;
}

/**
 * Days in the week that had a plan at all.
 *
 * The denominator for the week summary. "3 of 7" would quietly count days the
 * app was never opened as failures; "3 of 5 planned days" says what happened.
 */
export function plannedDayCount(week: DayCompletion[]): number {
  return week.filter((day) => day.total > 0).length;
}
