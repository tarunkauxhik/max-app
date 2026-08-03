import { useCallback, useEffect, useState } from 'react';

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

/**
 * Today's actions and check-in for one goal.
 *
 * Loads both together because the check-in button's enabled state depends on
 * every action being complete — showing one without the other would render a
 * button whose reason for being disabled had not arrived yet.
 *
 * **Known limitation:** the date is captured when the load runs. An app left
 * open in the foreground across midnight keeps writing to the previous day until
 * something triggers a reload. Fixing it properly means reacting to `AppState`
 * and to a clock tick, which belongs with the refresh work in M6.
 */
export type TodayState =
  | { status: 'loading' }
  | { status: 'ready'; actions: DailyAction[]; checkedIn: boolean }
  | { status: 'error'; message: string; retry: () => void };

type TodayValue = {
  state: TodayState;
  /** Null while nothing is in flight; otherwise the message to surface. */
  writeError: string | null;
  dismissWriteError: () => void;
  toggleAction: (actionId: string) => void;
  checkIn: (note: string) => void;
  checkingIn: boolean;
};

export function useToday(goal: Goal): TodayValue {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<TodayState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);
  const dismissWriteError = useCallback(() => setWriteError(null), []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    const date = localDateString();

    void (async () => {
      // Sequential, not parallel: seeding runs inside `loadActionsForDate`, and
      // there is no reason to ask about a check-in for a day whose actions could
      // not be loaded.
      const actions = await loadActionsForDate(userId, goal, date);

      if (cancelled) {
        return;
      }
      if (!actions.ok) {
        setState({ status: 'error', message: actions.message, retry });
        return;
      }

      const checkIn = await fetchCheckIn(userId, goal.id, date);

      if (cancelled) {
        return;
      }
      setState(
        checkIn.ok
          ? { status: 'ready', actions: actions.actions, checkedIn: checkIn.checkedIn }
          : { status: 'error', message: checkIn.message, retry }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, goal, attempt, retry]);

  /**
   * Optimistic, with a rollback.
   *
   * A checkbox that waits for a round trip before moving reads as broken, and
   * one that moves and then silently lies is worse. This moves immediately, and
   * puts the row back exactly as it was if the write fails — including
   * `completedAt`, so a rolled-back tick does not lose its original timestamp.
   */
  const toggleAction = useCallback(
    (actionId: string) => {
      if (!userId || state.status !== 'ready') {
        return;
      }

      const target = state.actions.find((action) => action.id === actionId);
      if (!target) {
        return;
      }

      const nextCompleted = target.completedAt === null;
      const previousCompletedAt = target.completedAt;

      // `checkedIn` is deliberately untouched. Before M5a.5 this screen cleared
      // it whenever an action was unticked, because it was a local flag with no
      // meaning beyond the session. It is now a row: the check-in genuinely
      // happened, and unticking an action afterwards does not un-happen it.
      // Undoing one would mean deleting that row, which no screen offers.
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              actions: current.actions.map((action) =>
                action.id === actionId
                  ? { ...action, completedAt: nextCompleted ? new Date().toISOString() : null }
                  : action
              ),
            }
          : current
      );

      void setActionCompleted(actionId, userId, nextCompleted).then((result) => {
        if (result.ok) {
          return;
        }
        setWriteError(result.message);
        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                actions: current.actions.map((action) =>
                  action.id === actionId ? { ...action, completedAt: previousCompletedAt } : action
                ),
              }
            : current
        );
      });
    },
    [userId, state]
  );

  /**
   * Not optimistic, unlike the toggle.
   *
   * A check-in is the thing the user came to do, so claiming it landed and
   * quietly reverting would be the wrong way round. It is also cheap to wait
   * for: one insert, once a day.
   */
  const checkIn = useCallback(
    (note: string) => {
      if (!userId || checkingIn || state.status !== 'ready' || state.checkedIn) {
        return;
      }

      setCheckingIn(true);

      void createCheckIn(userId, goal.id, localDateString(), note).then((result) => {
        setCheckingIn(false);

        if (!result.ok) {
          setWriteError(result.message);
          return;
        }
        setState((current) =>
          current.status === 'ready' ? { ...current, checkedIn: true } : current
        );
      });
    },
    [userId, goal.id, checkingIn, state]
  );

  return { state, writeError, dismissWriteError, toggleAction, checkIn, checkingIn };
}
