import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/state';
import {
  EMPTY_ONBOARDING_RECORD,
  readOnboarding,
  writeOnboarding,
  type OnboardingRecord,
} from '@/features/onboarding/storage';
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
 * read it.
 *
 * Persisted per account since M4 — see `features/onboarding/storage.ts` for why
 * this one flag stopped being memory-only while the rest of ADR-005 stands.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [record, setRecord] = useState<OnboardingRecord>(EMPTY_ONBOARDING_RECORD);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Adjusted during render rather than in an effect. Reads are synchronous, so
  // there is no asynchronous gap to cover, and React re-runs this component
  // before committing — meaning the route guard below never sees a frame where
  // the account has changed but its onboarding state has not. An effect would
  // render one frame of the previous account's answers first.
  if (loadedFor !== userId) {
    setLoadedFor(userId);
    setRecord(userId ? readOnboarding(userId) : EMPTY_ONBOARDING_RECORD);
  }

  const persist = useCallback(
    (next: OnboardingRecord) => {
      setRecord(next);
      // Signed-out is not a state onboarding can be completed from, but the
      // guard keeps the write honest rather than relying on that.
      if (userId) {
        writeOnboarding(userId, next);
      }
    },
    [userId]
  );

  const complete = useCallback(
    (draft: OnboardingDraft) => {
      // Narrowing guard: the review step blocks confirmation until these are set.
      if (draft.commitment === null || draft.interests.length === 0) {
        return;
      }

      persist({
        completed: true,
        preferences: {
          interests: draft.interests,
          commitment: draft.commitment,
          completedAt: new Date().toISOString(),
        },
      });
    },
    [persist]
  );

  const skip = useCallback(() => {
    persist({ completed: true, preferences: null });
  }, [persist]);

  const value = useMemo(
    () => ({
      completed: record.completed,
      preferences: record.preferences,
      complete,
      skip,
    }),
    [record, complete, skip]
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
