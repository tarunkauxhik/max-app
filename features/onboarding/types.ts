export type Interest = 'fitness' | 'learning' | 'career' | 'wellbeing' | 'creative' | 'finance';

export type Commitment = 'light' | 'regular' | 'serious';

/** Selections being made during the onboarding flow. */
export type OnboardingDraft = {
  interests: Interest[];
  commitment: Commitment | null;
};

/** Confirmed preferences. Session-only — see ADR-005. */
export type OnboardingPreferences = {
  interests: Interest[];
  commitment: Commitment;
  completedAt: string;
};

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  interests: [],
  commitment: null,
};

/** Keeping the choice narrow is the point: three is a focus, six is a wish list. */
export const MAX_INTERESTS = 3;

export const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'learning', label: 'Learning' },
  { value: 'career', label: 'Career' },
  { value: 'wellbeing', label: 'Wellbeing' },
  { value: 'creative', label: 'Creative' },
  { value: 'finance', label: 'Finance' },
];

export const COMMITMENT_OPTIONS: { value: Commitment; label: string; note: string }[] = [
  { value: 'light', label: 'Light', note: 'Around 10 minutes a day' },
  { value: 'regular', label: 'Regular', note: 'Around 25 minutes a day' },
  { value: 'serious', label: 'Serious', note: 'Around 45 minutes a day' },
];

/**
 * Narrow what the database returns.
 *
 * The generated types describe `interests` as `string[]` and `commitment` as
 * `string | null`, because a CHECK constraint is not something TypeScript can
 * see. The database does enforce both lists — but QUALITY_GATES requires backend
 * output to be validated at the boundary rather than asserted, and these rows
 * can also predate a future change to either list.
 *
 * Unknown values are dropped rather than rendered. `interestLabel` would
 * otherwise echo a raw column value into the UI.
 */
export function parseInterests(values: string[] | null): Interest[] {
  if (!values) {
    return [];
  }
  return values.filter((value): value is Interest =>
    INTEREST_OPTIONS.some((option) => option.value === value)
  );
}

export function parseCommitment(value: string | null): Commitment | null {
  return COMMITMENT_OPTIONS.some((option) => option.value === value)
    ? (value as Commitment)
    : null;
}

export function interestLabel(value: Interest): string {
  const match = INTEREST_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}

export function commitmentLabel(value: Commitment): string {
  const match = COMMITMENT_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}
