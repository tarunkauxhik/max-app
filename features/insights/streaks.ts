import { shiftDate } from '@/lib/dates';

/**
 * Streaks, derived from check-in dates. Never stored — see ADR-012.
 *
 * A streak is consecutive **local calendar days** on which at least one check-in
 * exists. The dates come out of `check_ins.check_in_date`, which the client
 * already wrote in its own local calendar, so this needs no timezone arithmetic:
 * comparing the strings is comparing the user's own days.
 *
 * Several goals checked in on one day is still one day. Callers pass every
 * check-in date; deduplication happens here rather than being assumed upstream.
 */

export type Streaks = {
  current: number;
  longest: number;
};

/**
 * `today` is passed in rather than read from the clock, so the result is a pure
 * function of its inputs and can be reasoned about — and tested — without
 * depending on when it runs.
 */
export function computeStreaks(checkInDates: string[], today: string): Streaks {
  const days = new Set(checkInDates);

  if (days.size === 0) {
    return { current: 0, longest: 0 };
  }

  return { current: currentStreak(days, today), longest: longestStreak(days) };
}

/**
 * Counts back from today, or from yesterday when today has no check-in yet.
 *
 * The yesterday allowance is the whole point: without it every user opens the
 * app each morning to a zero, which is discouraging and arguably false, because
 * the day is not over. A streak only breaks once a full day has passed with
 * nothing recorded in it.
 */
function currentStreak(days: Set<string>, today: string): number {
  let cursor = today;

  if (!days.has(cursor)) {
    cursor = shiftDate(today, -1);

    if (!days.has(cursor)) {
      return 0;
    }
  }

  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}

/**
 * The longest run anywhere in the history.
 *
 * Walks the sorted distinct dates once. A run continues when the next date is
 * exactly one day after the previous, which `shiftDate` decides rather than any
 * arithmetic here — month ends, leap days and DST are all its problem.
 */
function longestStreak(days: Set<string>): number {
  const sorted = [...days].sort();

  let longest = 1;
  let run = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    run = sorted[index] === shiftDate(sorted[index - 1], 1) ? run + 1 : 1;

    if (run > longest) {
      longest = run;
    }
  }
  return longest;
}
