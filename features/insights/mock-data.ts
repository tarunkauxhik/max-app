export type DayCompletion = {
  key: string;
  /** Short weekday label, e.g. "Mon". */
  label: string;
  completed: number;
  total: number;
};

export type GoalProgress = {
  id: string;
  title: string;
  currentWeek: number;
  totalWeeks: number;
  completedActions: number;
  totalActions: number;
};

export type CheckIn = {
  id: string;
  /** Pre-formatted for display; no date maths in a static milestone. */
  date: string;
  note: string;
  actionsCompleted: number;
  actionsTotal: number;
};

export type InsightsSnapshot = {
  /** Exactly seven entries, Monday first. */
  week: DayCompletion[];
  currentStreakDays: number;
  longestStreakDays: number;
  goals: GoalProgress[];
  recentCheckIns: CheckIn[];
};

/** A day counts as complete only when every action for it was finished. */
export function completeDayCount(week: DayCompletion[]): number {
  return week.filter((day) => day.total > 0 && day.completed === day.total).length;
}

export const insightsMock: InsightsSnapshot = {
  week: [
    { key: 'mon', label: 'Mon', completed: 4, total: 4 },
    { key: 'tue', label: 'Tue', completed: 3, total: 4 },
    { key: 'wed', label: 'Wed', completed: 4, total: 4 },
    { key: 'thu', label: 'Thu', completed: 0, total: 4 },
    { key: 'fri', label: 'Fri', completed: 4, total: 4 },
    { key: 'sat', label: 'Sat', completed: 2, total: 4 },
    { key: 'sun', label: 'Sun', completed: 1, total: 4 },
  ],
  currentStreakDays: 12,
  longestStreakDays: 21,
  goals: [
    {
      id: 'g1',
      title: 'Run a half marathon',
      currentWeek: 3,
      totalWeeks: 8,
      completedActions: 46,
      totalActions: 72,
    },
    {
      id: 'g2',
      title: 'Read 20 pages a day',
      currentWeek: 6,
      totalWeeks: 12,
      completedActions: 31,
      totalActions: 60,
    },
  ],
  recentCheckIns: [
    {
      id: 'c1',
      date: 'Sunday 2 August',
      note: 'Short run, legs still heavy from Friday.',
      actionsCompleted: 1,
      actionsTotal: 4,
    },
    {
      id: 'c2',
      date: 'Saturday 1 August',
      note: 'Missed the mobility routine but the run felt easy.',
      actionsCompleted: 2,
      actionsTotal: 4,
    },
    {
      id: 'c3',
      date: 'Friday 31 July',
      note: 'Everything done. Best week so far.',
      actionsCompleted: 4,
      actionsTotal: 4,
    },
    {
      id: 'c4',
      date: 'Thursday 30 July',
      note: 'Rest day, nothing logged.',
      actionsCompleted: 0,
      actionsTotal: 4,
    },
    {
      id: 'c5',
      date: 'Wednesday 29 July',
      note: 'Hit every action before lunch.',
      actionsCompleted: 4,
      actionsTotal: 4,
    },
  ],
};

/** Swap this into `use-insights.ts` to exercise the empty state on device. */
export const emptyInsightsMock: InsightsSnapshot = {
  week: [
    { key: 'mon', label: 'Mon', completed: 0, total: 0 },
    { key: 'tue', label: 'Tue', completed: 0, total: 0 },
    { key: 'wed', label: 'Wed', completed: 0, total: 0 },
    { key: 'thu', label: 'Thu', completed: 0, total: 0 },
    { key: 'fri', label: 'Fri', completed: 0, total: 0 },
    { key: 'sat', label: 'Sat', completed: 0, total: 0 },
    { key: 'sun', label: 'Sun', completed: 0, total: 0 },
  ],
  currentStreakDays: 0,
  longestStreakDays: 0,
  goals: [],
  recentCheckIns: [],
};
