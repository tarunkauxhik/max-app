import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/state';
import { fetchInsights } from '@/features/insights/api';
import type { InsightsSnapshot } from '@/features/insights/types';
import { queryKeys } from '@/lib/query';

/**
 * Insights, derived from real rows since M5b and cached since M6a.
 *
 * This union was written in M1e against a fixture, with a comment saying the
 * error branch could not occur yet. It has now survived two milestones that
 * changed everything behind it and nothing about it, which is the argument for
 * having agreed the shape early.
 */
export type InsightsState =
  | { status: 'loading' }
  | { status: 'ready'; data: InsightsSnapshot }
  | { status: 'error'; message: string; retry: () => void };

export function useInsights(): InsightsState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.insights(userId ?? ''),
    queryFn: async () => {
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      const result = await fetchInsights(userId);

      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.snapshot;
    },
    enabled: userId !== null,
  });

  if (query.isPending || userId === null) {
    return { status: 'loading' };
  }
  if (query.isError) {
    return {
      status: 'error',
      message: query.error.message,
      retry: () => void query.refetch(),
    };
  }
  return { status: 'ready', data: query.data };
}
