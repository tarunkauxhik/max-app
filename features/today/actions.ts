import { difficultyLabel, type Goal } from '@/features/goals/types';

/** Mirrors `check_ins_note_length`. The server is the authority; this avoids a round trip. */
export const NOTE_MAX_LENGTH = 2000;

/** Shows only as the limit approaches, so it is guidance rather than pressure. */
export const NOTE_COUNTER_THRESHOLD = NOTE_MAX_LENGTH - 200;

/**
 * A check-in note is optional, so the only way to be invalid is to be too long.
 * Same shape as `validateTitle`: returns null when valid.
 */
export function validateNote(note: string): string | null {
  return note.trim().length > NOTE_MAX_LENGTH
    ? `Keep it under ${NOTE_MAX_LENGTH} characters`
    : null;
}

/**
 * The shape of one action before it becomes a row.
 *
 * `position` is 1-based to match the `goal_actions_position_range` constraint,
 * and it is what `goal_actions_goal_date_position_key` uses to make a duplicate
 * seed impossible rather than merely unlikely.
 */
export type ActionTemplate = {
  position: number;
  title: string;
  note: string | null;
};

/**
 * Today's plan for a goal.
 *
 * Still derived rather than intelligent: the real plan arrives with the AI
 * planning milestone, and three actions — a block of work, a review, and a log —
 * is the shape it will take. What changed in M5a.4 is where the output goes.
 * These are no longer rendered directly; they seed `goal_actions` rows for one
 * date, once, and every later read comes from the table.
 *
 * That is why this stayed client-side. Putting the generator in a database
 * function would mean every change to the plan became a migration, which is the
 * trap ADR-012 avoided by keeping the difficulty chips out of the schema — and
 * M8 replaces this function entirely.
 */
export function planActionsFor(goal: Goal): ActionTemplate[] {
  const pace = difficultyLabel(goal.difficulty).toLowerCase();

  return [
    {
      position: 1,
      title: `${goal.title} — ${goal.minutesPerDay} minutes`,
      note: `Your ${pace} pace for today`,
    },
    {
      position: 2,
      title: 'Review what you did yesterday',
      note: null,
    },
    {
      position: 3,
      title: 'Log how it went',
      note: 'One line is enough',
    },
  ];
}
