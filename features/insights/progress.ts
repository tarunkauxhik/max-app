import { shiftDate } from '@/lib/dates';

/**
 * "Week N of M", derived rather than stored, per ADR-012.
 *
 * Kept out of `api.ts` so it is a pure function of its arguments rather than
 * something reachable only through a network call — the same reason
 * `computeStreaks` takes `today` instead of reading the clock.
 *
 * Counted by stepping whole days rather than by subtracting timestamps and
 * dividing, so the answer stays a whole number of *calendar* days across DST
 * boundaries, where a "day" is not always 24 hours.
 *
 * Clamped at both ends. A goal cannot be in week 0, and one still being worked
 * past its planned duration reads "week 8 of 8" rather than "week 11 of 8" —
 * running over is a normal thing to do, not an error to put on screen.
 */
export function currentWeekOf(startDate: string, today: string, durationWeeks: number): number {
  const maxDays = durationWeeks * 7;

  let elapsedDays = 0;
  let cursor = startDate;

  // A start date in the future leaves this loop untouched and yields week 1,
  // which is the only sensible reading of a goal that has not begun.
  while (cursor < today && elapsedDays < maxDays) {
    cursor = shiftDate(cursor, 1);
    elapsedDays += 1;
  }

  return Math.min(Math.floor(elapsedDays / 7) + 1, durationWeeks);
}
