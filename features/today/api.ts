import type { Goal } from '@/features/goals/types';
import { planActionsFor } from '@/features/today/actions';
import { supabase } from '@/lib/supabase';

/**
 * Reads and writes for `goal_actions` and `check_ins`.
 *
 * Both are scoped to one goal and one **local** calendar date, supplied by the
 * caller. Neither column has a server default, deliberately — see ADR-012 and
 * `lib/dates.ts`.
 */

const ACTION_SELECT = 'id, position, title, note, completed_at';

/** Postgres unique violation. Both tables rely on it rather than on checking first. */
const UNIQUE_VIOLATION = '23505';

/**
 * `invalid_parameter_value`, raised by `validate_check_in_date`.
 *
 * Reachable in one narrow case: the account's `profiles.timezone` is still the
 * `'UTC'` default while the device is ahead of UTC, so between local midnight
 * and UTC midnight the device's own date looks like the future to the trigger.
 * The timezone is written by the reconcile in `OnboardingProvider`, so this only
 * survives a sign-in where that request failed.
 */
const INVALID_PARAMETER = '22023';

export type DailyAction = {
  id: string;
  position: number;
  title: string;
  note: string | null;
  completedAt: string | null;
};

export type ActionsResult =
  | { ok: true; actions: DailyAction[] }
  | { ok: false; message: string };

export type CheckInResult = { ok: true; checkedIn: boolean } | { ok: false; message: string };
export type WriteResult = { ok: true } | { ok: false; message: string };

const LOAD_FAILED = "Could not load today's actions. Check your connection and try again.";
const TOGGLE_FAILED = 'Could not save that. Check your connection and try again.';
const CHECK_IN_FAILED = 'Could not check in. Check your connection and try again.';

type ActionRow = {
  id: string;
  position: number;
  title: string;
  note: string | null;
  completed_at: string | null;
};

function toAction(row: ActionRow): DailyAction {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    note: row.note,
    completedAt: row.completed_at,
  };
}

async function readActions(userId: string, goalId: string, date: string): Promise<ActionsResult> {
  const { data, error } = await supabase
    .from('goal_actions')
    .select(ACTION_SELECT)
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('scheduled_date', date)
    .order('position');

  if (error) {
    return { ok: false, message: LOAD_FAILED };
  }
  return { ok: true, actions: data.map(toAction) };
}

/**
 * Today's actions, generating them on first use.
 *
 * Lazy and per-day, so a twelve-week goal that is never opened writes no rows,
 * and M8's planner can replace this without a data migration for days that have
 * not happened yet.
 *
 * The race is handled by the database rather than by a check. Two loads landing
 * together both see an empty read and both insert; the second fails on
 * `goal_actions_goal_date_position_key` with `23505`, and the recovery is simply
 * to read what the winner wrote. Testing "does it exist" before inserting would
 * not close that window — the constraint does.
 *
 * Any other insert error is reported rather than swallowed, so a genuine
 * network or permission failure does not masquerade as a lost race.
 */
export async function loadActionsForDate(
  userId: string,
  goal: Goal,
  date: string
): Promise<ActionsResult> {
  const existing = await readActions(userId, goal.id, date);

  if (!existing.ok || existing.actions.length > 0) {
    return existing;
  }

  const rows = planActionsFor(goal).map((template) => ({
    goal_id: goal.id,
    user_id: userId,
    scheduled_date: date,
    position: template.position,
    title: template.title,
    note: template.note,
  }));

  const { data, error } = await supabase
    .from('goal_actions')
    .insert(rows)
    .select(ACTION_SELECT)
    .order('position');

  if (error) {
    return error.code === UNIQUE_VIOLATION
      ? readActions(userId, goal.id, date)
      : { ok: false, message: LOAD_FAILED };
  }
  return { ok: true, actions: data.map(toAction) };
}

/**
 * `completed_at` is the completion state — there is no boolean column, because a
 * second source of truth for the same fact is what ADR-012 set out to avoid.
 */
export async function setActionCompleted(
  actionId: string,
  userId: string,
  completed: boolean
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from('goal_actions')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', actionId)
    .eq('user_id', userId)
    .select('id');

  if (error || !data || data.length === 0) {
    return { ok: false, message: TOGGLE_FAILED };
  }
  return { ok: true };
}

export async function fetchCheckIn(
  userId: string,
  goalId: string,
  date: string
): Promise<CheckInResult> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('check_in_date', date)
    .limit(1);

  if (error) {
    return { ok: false, message: LOAD_FAILED };
  }
  return { ok: true, checkedIn: data.length > 0 };
}

/**
 * One check-in per goal per local day, enforced by
 * `check_ins_goal_date_key` rather than by asking first.
 *
 * A `23505` here is **not** a failure to report. It means a check-in for this
 * day already exists, which is precisely the state the caller was trying to
 * reach — most likely because the button was pressed twice, or the same day was
 * checked in on another device.
 */
export async function createCheckIn(
  userId: string,
  goalId: string,
  date: string,
  note: string
): Promise<WriteResult> {
  const trimmed = note.trim();

  const { error } = await supabase.from('check_ins').insert({
    user_id: userId,
    goal_id: goalId,
    check_in_date: date,
    // Null rather than an empty string. The column is nullable precisely so
    // "wrote nothing" and "wrote nothing today" are the same fact, and Insights
    // can render the difference between a note and no note.
    note: trimmed.length > 0 ? trimmed : null,
  });

  if (!error || error.code === UNIQUE_VIOLATION) {
    return { ok: true };
  }
  if (error.code === INVALID_PARAMETER) {
    // Saying "check your connection" here would send the user to fix something
    // that is not broken. Reopening the app runs the reconcile, which writes the
    // timezone this check depends on.
    return {
      ok: false,
      message: 'Your time zone has not synced yet. Reopen the app and try again.',
    };
  }
  return { ok: false, message: CHECK_IN_FAILED };
}
