import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/state';
import { fetchActiveGoal } from '@/features/goals/api';
import type { Goal } from '@/features/goals/types';
import { queryKeys } from '@/lib/query';

/**
 * The signed-in account's active goal.
 *
 * Keeps returning `reload` alongside the state. Ending a goal happens on Today
 * itself, so the screen has to refresh what it just changed — `retry` in the
 * error branch is the same function, and neither caller should have to know
 * that.
 */
export type ActiveGoalState =
  | { status: 'loading' }
  | { status: 'ready'; goal: Goal | null }
  | { status: 'error'; message: string; retry: () => void };

export function useActiveGoal(): { state: ActiveGoalState; reload: () => void } {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.activeGoal(userId ?? ''),
    queryFn: async () => {
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      const result = await fetchActiveGoal(userId);

      if (!result.ok) {
        throw new Error(result.message);
      }
      // Null is a legitimate answer — no active goal is the empty state, not a
      // failure — so it has to be wrapped. React Query treats a bare
      // `undefined` as "no data", and an unwrapped null would be indistinguishable
      // from a query that has not run.
      return { goal: result.goal };
    },
    enabled: userId !== null,
  });

  const reload = useCallback(() => void query.refetch(), [query]);

  if (query.isPending || userId === null) {
    return { state: { status: 'loading' }, reload };
  }
  if (query.isError) {
    return {
      state: { status: 'error', message: query.error.message, retry: reload },
      reload,
    };
  }
  return { state: { status: 'ready', goal: query.data.goal }, reload };
}
