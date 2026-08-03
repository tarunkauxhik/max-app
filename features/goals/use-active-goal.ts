import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/state';
import { fetchActiveGoal } from '@/features/goals/api';
import type { Goal } from '@/features/goals/types';

/**
 * The signed-in account's active goal.
 *
 * Same union as `useProfile`, for the reason ADR-009 gave: one agreed shape for
 * every server-backed screen. It differs in returning `reload` alongside the
 * state, because this screen also *writes* — archiving happens on Today itself
 * and has to refresh what it just changed. `retry` in the error branch is the
 * same function; both are exposed so neither caller has to know that.
 */
export type ActiveGoalState =
  | { status: 'loading' }
  | { status: 'ready'; goal: Goal | null }
  | { status: 'error'; message: string; retry: () => void };

export function useActiveGoal(): { state: ActiveGoalState; reload: () => void } {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<ActiveGoalState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((previous) => previous + 1), []);

  // Refetch on focus, so returning from the creation flow shows the goal that
  // was just created without the flow having to signal anything back. The first
  // focus is skipped because it coincides with mount, where the effect below
  // already fetches.
  const mounted = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      setAttempt((previous) => previous + 1);
    }, [])
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    void fetchActiveGoal(userId).then((result) => {
      if (cancelled) {
        return;
      }
      setState(
        result.ok
          ? { status: 'ready', goal: result.goal }
          : { status: 'error', message: result.message, retry: reload }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt, reload]);

  return { state, reload };
}
