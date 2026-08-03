import { difficultyLabel, type Goal } from '@/features/goals/types';

export type DailyAction = {
  id: string;
  title: string;
  note?: string;
};

/**
 * Today's actions for a goal.
 *
 * These are derived, not stored: the real plan comes from the AI planning
 * milestone, and inventing a fixture here would put a second, competing goal on
 * screen next to the one the user actually created. Three actions is the shape
 * the real plan will take — a main block of work, a review, and a log.
 */
export function deriveActions(goal: Goal): DailyAction[] {
  const pace = difficultyLabel(goal.difficulty).toLowerCase();

  return [
    {
      id: `${goal.id}-main`,
      title: `${goal.title} — ${goal.minutesPerDay} minutes`,
      note: `Your ${pace} pace for today`,
    },
    {
      id: `${goal.id}-review`,
      title: 'Review what you did yesterday',
    },
    {
      id: `${goal.id}-log`,
      title: 'Log how it went',
      note: 'One line is enough',
    },
  ];
}
