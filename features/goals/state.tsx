import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { EMPTY_DRAFT, type GoalDraft } from '@/features/goals/types';

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

/*
 * `SessionGoalProvider` lived here until M5a.3 and is deliberately gone.
 *
 * It held the confirmed goal in memory at the root, which meant it had to clear
 * itself on account change — it sat above the session gate, so signing out did
 * not unmount it, and one account's goal would otherwise have carried into the
 * next on a shared device. ADR-014 records that.
 *
 * The goal is now a row, and the guarantee moved with it: `goals_select_own`
 * restricts every read to `(select auth.uid()) = user_id`, so isolation is
 * enforced by the database rather than by remembering to reset a provider. That
 * is a strictly better place for it, and it is why this provider was removed
 * rather than kept alongside the query.
 *
 * `GoalDraftProvider` above stays. A half-finished form has no business being a
 * row, and it is mounted inside the flow, so it is discarded on exit anyway.
 */
