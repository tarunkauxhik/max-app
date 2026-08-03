import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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
import { fetchProfile, saveOnboarding, saveTimezone } from '@/features/profile/api';
import { deviceTimeZone } from '@/lib/dates';

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
 * Two stores, with different jobs. **The device record is the fast path** and is
 * what the route guard reads: it is synchronous, so a cold start decides which
 * screen to show without waiting for a request, and it still decides correctly
 * with no network at all. **The `profiles` row is the source of truth**, and the
 * two are reconciled in the background after sign-in.
 *
 * Moving the guard itself onto the server was the obvious alternative and is
 * wrong: it would put a network round trip in front of every launch and leave
 * the app unusable offline, to protect against a divergence that the reconcile
 * below already repairs.
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

  /**
   * Reconcile the device record against `profiles` once per signed-in account.
   *
   * Reads storage directly rather than depending on `record`, so completing
   * onboarding does not retrigger this effect — and so it compares against what
   * is actually persisted rather than what is currently rendered.
   *
   * Every failure here is silent on purpose. This is background repair, not a
   * user action: the device record already keeps the app working, and the retry
   * is simply the next launch. Surfacing an error would interrupt someone who
   * has no idea a sync was happening and no way to act on it.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await fetchProfile(userId);

      if (cancelled || !result.ok) {
        return;
      }

      const server = result.profile;
      const local = readOnboarding(userId);

      if (server.onboardingCompletedAt && !local.completed) {
        // Server is ahead — this account onboarded on another device, or this
        // device's store was cleared. Adopt it.
        const adopted: OnboardingRecord = {
          completed: true,
          preferences: server.commitment
            ? {
                interests: server.interests,
                commitment: server.commitment,
                completedAt: server.onboardingCompletedAt,
              }
            : null,
        };

        writeOnboarding(userId, adopted);
        if (!cancelled) {
          setRecord(adopted);
        }
      } else if (!server.onboardingCompletedAt && local.completed) {
        // Device is ahead — either the write at completion failed, or the
        // account onboarded before M5a existed. Every account created during M4
        // is in exactly this state, so this path runs on the first launch after
        // this change ships.
        await saveOnboarding(userId, {
          interests: local.preferences?.interests ?? [],
          commitment: local.preferences?.commitment ?? null,
          completedAt: local.preferences?.completedAt ?? new Date().toISOString(),
        });
      }

      // Written only when it actually differs, so this is not a request on every
      // launch — and it does follow someone who changes timezone or travels.
      const zone = deviceTimeZone();
      if (zone && zone !== server.timezone) {
        await saveTimezone(userId, zone);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  /**
   * Device first, then the server.
   *
   * The order matters. Writing the device record synchronously flips the route
   * guard in the same frame, so finishing onboarding moves to Today immediately
   * instead of waiting on a request that might be slow or fail. The server write
   * follows in the background; if it fails, the reconcile above pushes it up on
   * the next launch, which is why nothing is shown to the user here.
   *
   * The same `completedAt` goes to both stores, so they hold one instant rather
   * than two that happen to be close.
   */
  const pushToServer = useCallback(
    (record: OnboardingRecord) => {
      if (!userId || !record.completed) {
        return;
      }
      void saveOnboarding(userId, {
        interests: record.preferences?.interests ?? [],
        commitment: record.preferences?.commitment ?? null,
        completedAt: record.preferences?.completedAt ?? new Date().toISOString(),
      });
    },
    [userId]
  );

  const complete = useCallback(
    (draft: OnboardingDraft) => {
      // Narrowing guard: the review step blocks confirmation until these are set.
      if (draft.commitment === null || draft.interests.length === 0) {
        return;
      }

      const next: OnboardingRecord = {
        completed: true,
        preferences: {
          interests: draft.interests,
          commitment: draft.commitment,
          completedAt: new Date().toISOString(),
        },
      };

      persist(next);
      pushToServer(next);
    },
    [persist, pushToServer]
  );

  /**
   * Skipping still writes `onboarding_completed_at`. The column records that the
   * flow was passed, not that answers were given — leaving it null would make
   * every launch reconcile a skip back into "not onboarded".
   */
  const skip = useCallback(() => {
    const next: OnboardingRecord = { completed: true, preferences: null };

    persist(next);
    pushToServer(next);
  }, [persist, pushToServer]);

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
