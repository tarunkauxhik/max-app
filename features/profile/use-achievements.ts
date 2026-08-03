import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/state';
import { fetchAchievements, type Achievements } from '@/features/insights/api';

/**
 * The three Profile achievement figures.
 *
 * Reads from `features/insights/api.ts` rather than defining its own counting,
 * so "longest streak" on Profile and "longest streak" on Insights are the same
 * number produced by the same function. Two implementations of one statistic is
 * how they drift.
 */
export type AchievementsState =
  | { status: 'loading' }
  | { status: 'ready'; achievements: Achievements }
  | { status: 'error'; message: string; retry: () => void };

export function useAchievements(): AchievementsState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<AchievementsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

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

    void fetchAchievements(userId).then((result) => {
      if (cancelled) {
        return;
      }
      setState(
        result.ok
          ? { status: 'ready', achievements: result.achievements }
          : { status: 'error', message: result.message, retry }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt, retry]);

  return state;
}
