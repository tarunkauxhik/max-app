import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  EMPTY_ONBOARDING_DRAFT,
  MAX_INTERESTS,
  type Commitment,
  type Interest,
  type OnboardingDraft,
  type OnboardingPreferences,
} from '@/features/onboarding/types';

type OnboardingDraftValue = {
  draft: OnboardingDraft;
  toggleInterest: (value: Interest) => void;
  setCommitment: (value: Commitment) => void;
};

const OnboardingDraftContext = createContext<OnboardingDraftValue | null>(null);

/**
 * Holds selections for the duration of the onboarding flow.
 *
 * Mounted in `app/onboarding/_layout.tsx`, so it survives movement between
 * steps — that is what preserves selections on backward navigation.
 */
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_ONBOARDING_DRAFT);

  const toggleInterest = useCallback((value: Interest) => {
    setDraft((previous) => {
      if (previous.interests.includes(value)) {
        return { ...previous, interests: previous.interests.filter((entry) => entry !== value) };
      }
      // The cap is also enforced in the UI by disabling unselected options;
      // this guard keeps the rule true regardless of how it is called.
      if (previous.interests.length >= MAX_INTERESTS) {
        return previous;
      }
      return { ...previous, interests: [...previous.interests, value] };
    });
  }, []);

  const setCommitment = useCallback((commitment: Commitment) => {
    setDraft((previous) => ({ ...previous, commitment }));
  }, []);

  const value = useMemo(
    () => ({ draft, toggleInterest, setCommitment }),
    [draft, toggleInterest, setCommitment]
  );

  return (
    <OnboardingDraftContext.Provider value={value}>{children}</OnboardingDraftContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingDraftValue {
  const value = useContext(OnboardingDraftContext);

  if (!value) {
    throw new Error('useOnboardingDraft must be used inside OnboardingDraftProvider');
  }
  return value;
}

type OnboardingValue = {
  completed: boolean;
  preferences: OnboardingPreferences | null;
  complete: (draft: OnboardingDraft) => void;
  skip: () => void;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

/**
 * Whether onboarding has been passed, held at the root so the route guard can
 * read it. Memory only: reloading shows onboarding again, per ADR-005.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState(false);
  const [preferences, setPreferences] = useState<OnboardingPreferences | null>(null);

  const complete = useCallback((draft: OnboardingDraft) => {
    // Narrowing guard: the review step blocks confirmation until these are set.
    if (draft.commitment === null || draft.interests.length === 0) {
      return;
    }

    setPreferences({
      interests: draft.interests,
      commitment: draft.commitment,
      completedAt: new Date().toISOString(),
    });
    setCompleted(true);
  }, []);

  const skip = useCallback(() => {
    setPreferences(null);
    setCompleted(true);
  }, []);

  const value = useMemo(
    () => ({ completed, preferences, complete, skip }),
    [completed, preferences, complete, skip]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const value = useContext(OnboardingContext);

  if (!value) {
    throw new Error('useOnboarding must be used inside OnboardingProvider');
  }
  return value;
}
