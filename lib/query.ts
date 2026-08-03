import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * The query client, and the two managers React Query cannot wire itself on
 * native.
 *
 * Created at module scope rather than in a component. The module is a
 * singleton, so this runs once; building it inside a provider would risk a new
 * cache — and a silently empty one — on any remount of the root.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough that switching tabs does not re-request what was just
      // fetched, short enough that a check-in made on Today is reflected on
      // Insights a moment later. Before M6 every tab focus issued a request.
      staleTime: 30_000,

      // Kept in memory for an hour after nothing is observing it, so returning
      // to a screen shows its last data immediately while a refetch runs behind
      // it. M6b extends this beyond the process lifetime.
      gcTime: 60 * 60_000,

      // One retry, not the default three. These are user-facing screens with a
      // visible Try again button; three silent attempts mostly means the user
      // stares at a spinner for longer before being told the same thing.
      retry: 1,
      refetchOnReconnect: true,
    },
    mutations: {
      // Writes are never retried automatically. Some are safe to replay and
      // some are not — creating a goal twice is the case that is not — and a
      // blanket retry cannot tell the difference. ADR-018 records this.
      retry: false,
    },
  },
});

/**
 * Query keys, in one place.
 *
 * **Every key carries the user id.** `queryClient.clear()` on sign-out is the
 * real control, but this means that even if that clear were ever missed, one
 * account's key cannot address another's entry. This is the M5a
 * `SessionGoalProvider` lesson one layer up: anything holding data above the
 * session gate outlives the account that filled it.
 */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  activeGoal: (userId: string) => ['active-goal', userId] as const,
  today: (userId: string, goalId: string, date: string) =>
    ['today', userId, goalId, date] as const,
  insights: (userId: string) => ['insights', userId] as const,
  achievements: (userId: string) => ['achievements', userId] as const,
};

/**
 * Everything derived from rows the user just changed.
 *
 * A check-in moves the streak, the weekly bars and the achievement tiles at
 * once, because ADR-012 stores none of them. Listing the affected keys at each
 * call site would mean remembering all of them every time; naming the set once
 * is what keeps a new mutation from quietly leaving Insights stale.
 */
export function invalidateDerived(userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.insights(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.achievements(userId) }),
  ]);
}

/**
 * Refetch when the app comes back to the foreground.
 *
 * React Query's own focus detection is a browser `visibilitychange` listener,
 * which never fires here, so without this a phone left on Today overnight shows
 * yesterday until something else triggers a fetch.
 */
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

AppState.addEventListener('change', onAppStateChange);

/**
 * Connectivity, from `expo-network`.
 *
 * Same gap: the default `onlineManager` listens for browser online/offline
 * events, so on native the client would believe it is permanently connected and
 * never refetch on reconnect.
 *
 * `isInternetReachable` is preferred over `isConnected` where the platform
 * supplies it — a phone attached to a wifi network with no route out is
 * connected and useless, which is exactly the state a captive portal produces.
 * It is `undefined` until the first probe resolves, so `isConnected` is the
 * fallback rather than a coin flip.
 */
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isInternetReachable ?? state.isConnected ?? true);
  });

  return () => subscription.remove();
});
