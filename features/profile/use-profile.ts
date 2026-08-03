import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/state';
import { fetchProfile, type Profile } from '@/features/profile/api';
import { queryKeys } from '@/lib/query';

/**
 * The `profiles` row for the signed-in account.
 *
 * The union is unchanged from M5a — ADR-009 fixed that shape, and screens should
 * not have to care that the machinery behind it moved. What went away in M6a is
 * the machinery: an `attempt` counter, a `useFocusEffect` with a `mounted` ref
 * to skip the first focus, and a `cancelled` flag guarding against a resolved
 * request writing state for an account that has since signed out. React Query
 * owns all three, and it also deduplicates this with the read
 * `OnboardingProvider` makes of the same row on sign-in.
 */
export type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string; retry: () => void };

export function useProfile(): ProfileState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    // The key is evaluated even while disabled, so it needs a value for the
    // signed-out case rather than being omitted.
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: async () => {
      // Unreachable while `enabled` is false. Checking anyway is what lets this
      // narrow `userId` instead of asserting it non-null.
      if (userId === null) {
        throw new Error('No account is signed in.');
      }

      const result = await fetchProfile(userId);

      // Thrown rather than returned. `fetchProfile` reports failure in its
      // result type, which suits a caller that renders it; React Query decides
      // success by whether the promise rejects. The two conventions have to meet
      // somewhere, and this is the seam — repeated in each hook rather than
      // hidden behind a generic helper that would need a cast to type.
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.profile;
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
  return { status: 'ready', profile: query.data };
}
