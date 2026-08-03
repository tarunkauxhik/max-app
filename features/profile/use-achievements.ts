import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/state';
import { fetchAchievements, type Achievements } from '@/features/insights/api';
import { queryKeys } from '@/lib/query';

/**
 * The three Profile achievement figures.
 *
 * Still reads `features/insights/api.ts` rather than defining its own counting,
 * so "longest streak" on Profile and on Insights stay one function. M6a adds a
 * second reason they cannot drift: both are invalidated together by
 * `invalidateDerived`, so a check-in moves them in the same tick.
 */
export type AchievementsState =
  | { status: 'loading' }
  | { status: 'ready'; achievements: Achievements }
  | { status: 'error'; message: string; retry: () => void };

export function useAchievements(): AchievementsState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.achievements(userId ?? ''),
    queryFn: async () => {
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      const result = await fetchAchievements(userId);

      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.achievements;
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
  return { status: 'ready', achievements: query.data };
}
