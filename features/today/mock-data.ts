export type DailyAction = {
  id: string;
  title: string;
  note?: string;
};

export type TodaySnapshot = {
  goalTitle: string;
  streakDays: number;
  actions: DailyAction[];
};

/**
 * Static M1a fixture. No backend, no storage, no persistence — completion state
 * lives in component state for the session only and is replaced when the data
 * milestone lands.
 */
export const todayMock: TodaySnapshot = {
  goalTitle: 'Run a half marathon',
  streakDays: 12,
  actions: [
    { id: 'a1', title: 'Easy 5 km run', note: 'Keep the pace conversational' },
    { id: 'a2', title: 'Mobility routine', note: '10 minutes, hips and calves' },
    { id: 'a3', title: 'Log how the run felt' },
    { id: 'a4', title: 'Lights out by 23:00' },
  ],
};
