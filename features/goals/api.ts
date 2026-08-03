import {
  parseDifficulty,
  parseGoalStatus,
  type Goal,
  type GoalDraft,
} from '@/features/goals/types';
import { localDateString } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

/**
 * Reads and writes for `goals`.
 *
 * There is no delete. ADR-012 made deletion archival, and the schema enforces
 * it: `authenticated` holds no DELETE grant and there is no DELETE policy, so
 * the archive path cannot be bypassed from the client even by mistake.
 */

const SELECT = 'id, title, minutes_per_day, duration_weeks, difficulty, status, start_date, created_at';

export type GoalResult = { ok: true; goal: Goal | null } | { ok: false; message: string };
export type CreateResult = { ok: true; goal: Goal } | { ok: false; message: string };
export type WriteResult = { ok: true } | { ok: false; message: string };

const READ_FAILED = 'Could not load your goal. Check your connection and try again.';
const CREATE_FAILED = 'Could not save your goal. Check your connection and try again.';
const ARCHIVE_FAILED = 'Could not archive that goal. Check your connection and try again.';
const COMPLETE_FAILED = 'Could not complete that goal. Check your connection and try again.';

type GoalRow = {
  id: string;
  title: string;
  minutes_per_day: number;
  duration_weeks: number;
  difficulty: string;
  status: string;
  start_date: string;
  created_at: string;
};

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    minutesPerDay: row.minutes_per_day,
    durationWeeks: row.duration_weeks,
    difficulty: parseDifficulty(row.difficulty),
    status: parseGoalStatus(row.status),
    startDate: row.start_date,
    createdAt: row.created_at,
  };
}

/**
 * The one goal Today renders, or null.
 *
 * `limit(1)` rather than `single()`: having no active goal is the empty state,
 * not an error. The schema permits several active goals at once and MAX does not
 * offer a way to create a second one yet, so newest-first is a deterministic
 * choice rather than a rule — when multiple goals become a feature, this is the
 * query that changes.
 */
export async function fetchActiveGoal(userId: string): Promise<GoalResult> {
  const { data, error } = await supabase
    .from('goals')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return { ok: false, message: READ_FAILED };
  }

  const row = data.at(0);
  return { ok: true, goal: row ? toGoal(row) : null };
}

/**
 * `startDate` is the device's local calendar date, not the server's.
 *
 * The column has no default precisely so this choice has to be made explicitly:
 * `current_date` on the server would file a goal created at 02:00 in Kolkata
 * under the previous day. See ADR-012 and `lib/dates.ts`.
 */
export async function createGoal(userId: string, draft: GoalDraft): Promise<CreateResult> {
  if (draft.minutesPerDay === null || draft.durationWeeks === null || draft.difficulty === null) {
    // The review step blocks confirmation until these are set. This keeps the
    // function honest regardless of how it is called.
    return { ok: false, message: CREATE_FAILED };
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: draft.title.trim(),
      minutes_per_day: draft.minutesPerDay,
      duration_weeks: draft.durationWeeks,
      difficulty: draft.difficulty,
      start_date: localDateString(),
    })
    .select(SELECT)
    .single();

  if (error || !data) {
    return { ok: false, message: CREATE_FAILED };
  }
  return { ok: true, goal: toGoal(data) };
}

/**
 * Archive, not delete.
 *
 * `archived_at` is required rather than optional: `goals_status_timestamps`
 * rejects `status = 'archived'` with a null timestamp, so setting one without
 * the other fails the constraint instead of producing a half-archived row.
 *
 * Asks for the id back so an update RLS filtered out is reported as a failure
 * rather than as success affecting zero rows — see `features/profile/api.ts`.
 */
export async function archiveGoal(goalId: string, userId: string): Promise<WriteResult> {
  return setLifecycle(goalId, userId, 'archived', ARCHIVE_FAILED);
}

/**
 * The other end of the lifecycle, reachable from the app since M5b.
 *
 * `status = 'completed'` has existed since M3 and nothing could set it, so the
 * Profile "goals finished" figure had no way to be anything but zero. Same
 * constraint pairing as archiving — `goals_status_timestamps` requires
 * `completed_at` alongside the status — and the same column grant covers both.
 *
 * Deliberately one-way. Un-completing would need its own decision about what
 * happens to the check-ins recorded under a finished goal, and nothing needs it
 * yet.
 */
export async function completeGoal(goalId: string, userId: string): Promise<WriteResult> {
  return setLifecycle(goalId, userId, 'completed', COMPLETE_FAILED);
}

async function setLifecycle(
  goalId: string,
  userId: string,
  status: 'archived' | 'completed',
  failureMessage: string
): Promise<WriteResult> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('goals')
    .update(status === 'archived' ? { status, archived_at: now } : { status, completed_at: now })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select('id');

  if (error || !data || data.length === 0) {
    return { ok: false, message: failureMessage };
  }
  return { ok: true };
}
