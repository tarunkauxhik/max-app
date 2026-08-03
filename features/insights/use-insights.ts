import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/state';
import { fetchInsights } from '@/features/insights/api';
import type { InsightsSnapshot } from '@/features/insights/types';

/**
 * Insights, derived from real rows since M5b.
 *
 * This union was written in M1e against a fixture, with a comment saying the
 * error branch could not occur yet and the backend milestone would implement it.
 * That is what happened here — the shape did not change, only what fills it.
 */
export type InsightsState =
  | { status: 'loading' }
  | { status: 'ready'; data: InsightsSnapshot }
  | { status: 'error'; message: string; retry: () => void };

export function useInsights(): InsightsState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<InsightsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  // Refetch on focus: checking in on Today should be visible the moment the user
  // switches tabs, and this screen is almost always reached that way. The first
  // focus is skipped because it coincides with mount.
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

    void fetchInsights(userId).then((result) => {
      if (cancelled) {
        return;
      }
      setState(
        result.ok
          ? { status: 'ready', data: result.snapshot }
          : { status: 'error', message: result.message, retry }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt, retry]);

  return state;
}
