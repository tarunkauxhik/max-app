import Storage from 'expo-sqlite/kv-store';

import type { OnboardingPreferences } from '@/features/onboarding/types';

/**
 * Onboarding completion, persisted per account on the device.
 *
 * This narrowly supersedes ADR-005 for one piece of state. Everything else in
 * the app is still memory-only, but once the session survives a restart, an
 * onboarding flow that replays on every launch stops reading as "static
 * milestone" and starts reading as a bug. M5 moves this to the `profiles` row,
 * at which point the device copy becomes a cache rather than the source.
 *
 * Reads and writes are synchronous. `expo-sqlite/kv-store` offers both, and the
 * sync variants exist for exactly this case: the value is tiny, and an async
 * read would open a gap in which the route guard has to render *something*
 * before it knows whether onboarding is done.
 */

// Keyed per account. Two people signing into the same device must not inherit
// each other's answers, and signing out must not erase them for the next time
// that account signs in.
const KEY_PREFIX = 'max.onboarding.v1.';

export type OnboardingRecord = {
  completed: boolean;
  preferences: OnboardingPreferences | null;
};

export const EMPTY_ONBOARDING_RECORD: OnboardingRecord = {
  completed: false,
  preferences: null,
};

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function readOnboarding(userId: string): OnboardingRecord {
  const raw = Storage.getItemSync(keyFor(userId));

  if (!raw) {
    return EMPTY_ONBOARDING_RECORD;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    // Anything unexpected is treated as "not onboarded" rather than trusted.
    // The cost of being wrong is repeating a four-step flow; the cost of
    // trusting malformed data is a crash on every launch with no way back.
    if (typeof parsed !== 'object' || parsed === null || !('completed' in parsed)) {
      return EMPTY_ONBOARDING_RECORD;
    }

    const record = parsed as Partial<OnboardingRecord>;
    return {
      completed: record.completed === true,
      preferences: record.preferences ?? null,
    };
  } catch {
    return EMPTY_ONBOARDING_RECORD;
  }
}

export function writeOnboarding(userId: string, record: OnboardingRecord): void {
  try {
    Storage.setItemSync(keyFor(userId), JSON.stringify(record));
  } catch {
    // A failed write means onboarding replays on the next launch. That is a
    // tolerable degradation, and far better than an unhandled rejection
    // unmounting the tree at the moment the user finishes onboarding.
  }
}
