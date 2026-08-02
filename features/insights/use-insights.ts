import { useCallback, useEffect, useState } from 'react';

import { insightsMock, type InsightsSnapshot } from '@/features/insights/mock-data';

/**
 * The three states any server-backed screen in MAX can be in.
 *
 * `error` is declared but never produced here: there is no network yet, so
 * rendering a retry branch would ship UI that can never be reached. The shape is
 * fixed now so the backend milestone implements one agreed pattern — a message
 * plus a `retry` the user can actually press — rather than inventing a new one
 * per screen. See ADR-009.
 */
export type InsightsState =
  | { status: 'loading' }
  | { status: 'ready'; data: InsightsSnapshot }
  | { status: 'error'; message: string; retry: () => void };

const LOAD_DELAY_MS = 600;

/**
 * Simulates a fetch so the loading path is a real, testable state rather than a
 * branch nothing ever reaches. There is no network and no storage here.
 *
 * To exercise the empty state on device, swap `insightsMock` for
 * `emptyInsightsMock` below. A visible debug toggle was deliberately avoided —
 * it would ship as dead UI.
 */
export function useInsights(): InsightsState {
  const [state, setState] = useState<InsightsState>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    return setTimeout(() => setState({ status: 'ready', data: insightsMock }), LOAD_DELAY_MS);
  }, []);

  useEffect(() => {
    const timer = load();
    return () => clearTimeout(timer);
  }, [load]);

  return state;
}
