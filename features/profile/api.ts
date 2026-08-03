import {
  parseCommitment,
  parseInterests,
  type Commitment,
  type Interest,
} from '@/features/onboarding/types';
import { supabase } from '@/lib/supabase';

/**
 * Reads and writes for the `profiles` row.
 *
 * There is no insert here, and no insert grant either. `handle_new_user` creates
 * the row when the account is created, so the client only ever updates one that
 * already exists. A missing row is a real signal — it means the signup trigger
 * did not fire — rather than something to paper over by inserting one.
 */

/** The subset of `profiles` the app currently reads, already narrowed. */
export type Profile = {
  interests: Interest[];
  commitment: Commitment | null;
  onboardingCompletedAt: string | null;
  timezone: string;
};

export type ProfileResult =
  | { ok: true; profile: Profile }
  | { ok: false; message: string };

export type WriteResult = { ok: true } | { ok: false; message: string };

const READ_FAILED = 'Could not load your profile. Check your connection and try again.';
const WRITE_FAILED = 'Could not save your profile. Check your connection and try again.';

export async function fetchProfile(userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('interests, commitment, onboarding_completed_at, timezone')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: READ_FAILED };
  }
  if (!data) {
    // RLS returns an empty result rather than an error for a row that is not
    // yours, so this covers both "no such row" and "not mine". Either way the
    // app cannot proceed as if a profile existed.
    return { ok: false, message: READ_FAILED };
  }

  return {
    ok: true,
    profile: {
      interests: parseInterests(data.interests),
      commitment: parseCommitment(data.commitment),
      onboardingCompletedAt: data.onboarding_completed_at,
      timezone: data.timezone,
    },
  };
}

/**
 * Writes the onboarding answers.
 *
 * `completedAt` is passed in rather than generated here so the value stored on
 * the device and the value stored on the server are the same instant, not two
 * timestamps that happen to be close.
 */
export async function saveOnboarding(
  userId: string,
  answers: {
    interests: Interest[];
    commitment: Commitment | null;
    completedAt: string;
  }
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      interests: answers.interests,
      commitment: answers.commitment,
      onboarding_completed_at: answers.completedAt,
    })
    .eq('id', userId)
    .select('id');

  return settled(data, error);
}

export async function saveTimezone(userId: string, timezone: string): Promise<WriteResult> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ timezone })
    .eq('id', userId)
    .select('id');

  return settled(data, error);
}

/**
 * Turns "matched no rows" into a failure.
 *
 * An UPDATE that RLS filters out is **not** an error in PostgREST. It returns
 * success, affecting zero rows, and a caller checking only `error` reports that
 * it saved. That is the worst available outcome: silent data loss that looks
 * like success.
 *
 * Asking for the updated ids back is what makes the difference observable — an
 * empty array means the row was not reachable. Today `profiles_update_own`
 * permits this write and the array will hold one id; this guard is here so that
 * a future policy or grant change surfaces as a visible failure rather than as
 * writes that quietly stop landing.
 */
function settled(rows: { id: string }[] | null, error: unknown): WriteResult {
  if (error || !rows || rows.length === 0) {
    return { ok: false, message: WRITE_FAILED };
  }
  return { ok: true };
}
