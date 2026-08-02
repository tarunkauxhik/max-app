import { useEffect, useState } from 'react';

import { insightsMock, type InsightsSnapshot } from '@/features/insights/mock-data';

export type InsightsState = { status: 'loading' } | { status: 'ready'; data: InsightsSnapshot };

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

  useEffect(() => {
    const timer = setTimeout(() => setState({ status: 'ready', data: insightsMock }), LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return state;
}
