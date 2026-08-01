export type Difficulty = 'gentle' | 'steady' | 'intense';

/** In-progress goal being built by the creation flow. Nulls mean "not chosen yet". */
export type GoalDraft = {
  title: string;
  minutesPerDay: number | null;
  durationWeeks: number | null;
  difficulty: Difficulty | null;
};

/** A confirmed goal. Session-only — see ADR-005. */
export type LocalGoal = {
  id: string;
  title: string;
  minutesPerDay: number;
  durationWeeks: number;
  difficulty: Difficulty;
  createdAt: string;
};

export const EMPTY_DRAFT: GoalDraft = {
  title: '',
  minutesPerDay: null,
  durationWeeks: null,
  difficulty: null,
};

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 60;

export const MINUTES_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: '10 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];

export const WEEKS_OPTIONS: { value: number; label: string }[] = [
  { value: 2, label: '2 weeks' },
  { value: 4, label: '4 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' },
];

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; note: string }[] = [
  { value: 'gentle', label: 'Gentle', note: 'Room to miss a day without losing the thread' },
  { value: 'steady', label: 'Steady', note: 'A consistent daily push' },
  { value: 'intense', label: 'Intense', note: 'Little slack, fastest progress' },
];

/**
 * The single source of truth for title validity, used by both the entry step and
 * the review step. Returns null when valid.
 */
export function validateTitle(title: string): string | null {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return 'Enter a goal';
  }
  if (trimmed.length < TITLE_MIN_LENGTH) {
    return `Use at least ${TITLE_MIN_LENGTH} characters`;
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    return `Keep it under ${TITLE_MAX_LENGTH} characters`;
  }
  return null;
}

export function difficultyLabel(value: Difficulty): string {
  const match = DIFFICULTY_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}
