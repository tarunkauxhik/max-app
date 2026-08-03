import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useAuth } from '@/features/auth/state';
import type { Goal } from '@/features/goals/types';
import {
  createCheckIn,
  fetchCheckIn,
  loadActionsForDate,
  setActionCompleted,
  type DailyAction,
} from '@/features/today/api';
import { localDateString } from '@/lib/dates';
import { invalidateDerived, queryKeys } from '@/lib/query';

/**
 * Today's actions and check-in for one goal.
 *
 * Both are loaded under one key because the check-in button's enabled state
 * depends on every action being complete — showing one without the other would
 * render a button whose reason for being disabled had not arrived yet.
 *
 * **Known limitation:** the date is captured when the query key is built, so an
 * app left in the foreground across midnight keeps writing to the previous day.
 * M6b fixes this by recomputing the date on `AppState` and letting the changed
 * key pull a new day's data.
 */
export type TodayState =
  | { status: 'loading' }
  | { status: 'ready'; actions: DailyAction[]; checkedIn: boolean }
  | { status: 'error'; message: string; retry: () => void };

type TodayValue = {
  state: TodayState;
  /** Null while nothing has failed; otherwise the message to surface. */
  writeError: string | null;
  dismissWriteError: () => void;
  toggleAction: (actionId: string) => void;
  checkIn: (note: string) => void;
  checkingIn: boolean;
};

type TodayData = { actions: DailyAction[]; checkedIn: boolean };

export function useToday(goal: Goal): TodayValue {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const date = localDateString();
  const key = queryKeys.today(userId ?? '', goal.id, date);

  const [writeError, setWriteError] = useState<string | null>(null);
  const dismissWriteError = useCallback(() => setWriteError(null), []);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<TodayData> => {
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      // Sequential, not parallel: seeding runs inside `loadActionsForDate`, and
      // there is no reason to ask about a check-in for a day whose actions could
      // not be loaded.
      const actions = await loadActionsForDate(userId, goal, date);

      if (!actions.ok) {
        throw new Error(actions.message);
      }

      const checkIn = await fetchCheckIn(userId, goal.id, date);

      if (!checkIn.ok) {
        throw new Error(checkIn.message);
      }
      return { actions: actions.actions, checkedIn: checkIn.checkedIn };
    },
    enabled: userId !== null,
  });

  /**
   * Optimistic, with a rollback — now React Query's canonical version of the
   * hand-rolled one from M5a. The behaviour verified on device is unchanged: the
   * tick moves immediately and snaps back on failure with its original
   * timestamp intact, because `onMutate` returns the whole previous cache entry
   * rather than trying to reconstruct one field.
   */
  const toggle = useMutation({
    mutationFn: async (variables: { actionId: string; completed: boolean }) => {
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      const result = await setActionCompleted(variables.actionId, userId, variables.completed);

      if (!result.ok) {
        throw new Error(result.message);
      }
    },
    onMutate: async (variables) => {
      // Stops an in-flight refetch from landing after the optimistic write and
      // reverting it on screen.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TodayData>(key);

      queryClient.setQueryData<TodayData>(key, (current) =>
        current
          ? {
              ...current,
              actions: current.actions.map((action) =>
                action.id === variables.actionId
                  ? {
                      ...action,
                      completedAt: variables.completed ? new Date().toISOString() : null,
                    }
                  : action
              ),
            }
          : current
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      setWriteError(error.message);
    },
    onSuccess: () => {
      if (userId) {
        // Completing an action changes the weekly bars, so Insights and the
        // achievement tiles are stale from this moment.
        void invalidateDerived(userId);
      }
    },
  });

  /**
   * Not optimistic, unlike the toggle. A check-in is the thing the user came to
   * do, so claiming it landed and quietly reverting would be the wrong way
   * round — and it is cheap to wait for: one insert, once a day.
   */
  const check = useMutation({
    mutationFn: async (note: string) => {
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      const result = await createCheckIn(userId, goal.id, date, note);

      if (!result.ok) {
        throw new Error(result.message);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<TodayData>(key, (current) =>
        current ? { ...current, checkedIn: true } : current
      );
      if (userId) {
        void invalidateDerived(userId);
      }
    },
    onError: (error) => setWriteError(error.message),
  });

  const toggleAction = useCallback(
    (actionId: string) => {
      const target = query.data?.actions.find((action) => action.id === actionId);

      if (!target) {
        return;
      }
      toggle.mutate({ actionId, completed: target.completedAt === null });
    },
    [query.data, toggle]
  );

  const checkIn = useCallback(
    (note: string) => {
      if (check.isPending || query.data?.checkedIn) {
        return;
      }
      check.mutate(note);
    },
    [check, query.data]
  );

  const state: TodayState =
    query.isPending || userId === null
      ? { status: 'loading' }
      : query.isError
        ? {
            status: 'error',
            message: query.error.message,
            retry: () => void query.refetch(),
          }
        : { status: 'ready', actions: query.data.actions, checkedIn: query.data.checkedIn };

  return {
    state,
    writeError,
    dismissWriteError,
    toggleAction,
    checkIn,
    checkingIn: check.isPending,
  };
}
