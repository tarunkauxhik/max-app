import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/state';
import { EMPTY_DRAFT, type GoalDraft, type LocalGoal } from '@/features/goals/types';

type GoalDraftValue = {
  draft: GoalDraft;
  update: (patch: Partial<GoalDraft>) => void;
};

const GoalDraftContext = createContext<GoalDraftValue | null>(null);

/**
 * Holds the in-progress goal for the duration of the creation flow.
 *
 * Mounted in `app/goal/_layout.tsx`, so it stays alive while the user moves
 * between steps — that is what preserves input on backward navigation — and is
 * discarded when the flow is left entirely.
 */
export function GoalDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<GoalDraft>(EMPTY_DRAFT);

  const update = useCallback((patch: Partial<GoalDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  // No explicit reset: leaving the flow unmounts this provider, which discards
  // the draft on its own.
  const value = useMemo(() => ({ draft, update }), [draft, update]);

  return <GoalDraftContext.Provider value={value}>{children}</GoalDraftContext.Provider>;
}

export function useGoalDraft(): GoalDraftValue {
  const value = useContext(GoalDraftContext);

  if (!value) {
    throw new Error('useGoalDraft must be used inside GoalDraftProvider');
  }
  return value;
}

type SessionGoalValue = {
  goal: LocalGoal | null;
  saveGoal: (draft: GoalDraft) => void;
  clearGoal: () => void;
};

const SessionGoalContext = createContext<SessionGoalValue | null>(null);

/**
 * Holds the confirmed goal at the root so it outlives the creation flow.
 * Memory only: reloading the app clears it, per ADR-005.
 *
 * Mounted above the session gate, so unlike the tab tree it is *not* unmounted
 * when someone signs out. That makes clearing on account change this provider's
 * responsibility rather than the sign-out button's — the goal must not survive
 * into a different account on a shared device, and it must not survive a
 * session that ended without anyone pressing anything, such as an expired
 * refresh token.
 */
export function SessionGoalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [goal, setGoal] = useState<LocalGoal | null>(null);
  const [ownedBy, setOwnedBy] = useState<string | null>(null);

  // Adjusted during render, so no frame exists in which the previous account's
  // goal is visible to the next one. An effect would render that frame first.
  if (ownedBy !== userId) {
    setOwnedBy(userId);
    setGoal(null);
  }

  const saveGoal = useCallback((draft: GoalDraft) => {
    // Narrowing guard: the review step blocks confirmation until these are set.
    if (draft.minutesPerDay === null || draft.durationWeeks === null || draft.difficulty === null) {
      return;
    }

    setGoal({
      id: Date.now().toString(36),
      title: draft.title.trim(),
      minutesPerDay: draft.minutesPerDay,
      durationWeeks: draft.durationWeeks,
      difficulty: draft.difficulty,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const clearGoal = useCallback(() => setGoal(null), []);

  const value = useMemo(() => ({ goal, saveGoal, clearGoal }), [goal, saveGoal, clearGoal]);

  return <SessionGoalContext.Provider value={value}>{children}</SessionGoalContext.Provider>;
}

export function useSessionGoal(): SessionGoalValue {
  const value = useContext(SessionGoalContext);

  if (!value) {
    throw new Error('useSessionGoal must be used inside SessionGoalProvider');
  }
  return value;
}
