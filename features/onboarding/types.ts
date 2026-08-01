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

export function interestLabel(value: Interest): string {
  const match = INTEREST_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}

export function commitmentLabel(value: Commitment): string {
  const match = COMMITMENT_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}
