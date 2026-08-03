import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/state';
import { fetchProfile, type Profile } from '@/features/profile/api';

/**
 * The `profiles` row for the signed-in account.
 *
 * The first hook in MAX to actually reach the network, so it is the one that
 * establishes the shape. `useInsights` declared this union in M1e and never
 * produced the error branch, because nothing could fail yet. ADR-009 fixed the
 * shape then precisely so this milestone would implement it rather than invent a
 * second one — a message plus a `retry` the user can press.
 */
export type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string; retry: () => void };

export function useProfile(): ProfileState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  // Bumped by `retry`. Keeping the trigger in state rather than calling `load`
  // directly means a retry follows exactly the same path as the first attempt.
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Guards against a resolved request writing state for an account that is no
    // longer signed in — the same hazard `AuthProvider` handles with `settled`.
    let cancelled = false;
    setState({ status: 'loading' });

    void fetchProfile(userId).then((result) => {
      if (cancelled) {
        return;
      }
      setState(
        result.ok
          ? { status: 'ready', profile: result.profile }
          : { status: 'error', message: result.message, retry }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt, retry]);

  return state;
}
