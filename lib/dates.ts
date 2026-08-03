/**
 * Dates, computed the way the schema expects them.
 *
 * `goals.start_date`, `goal_actions.scheduled_date` and `check_ins.check_in_date`
 * all deliberately have no server default. ADR-012 explains why: `current_date`
 * is the *server's* date, and a user in Asia/Kolkata creating a goal at 02:00
 * local would have it filed under the previous day. The caller supplies the date
 * instead.
 */

/**
 * The device's local calendar date as `YYYY-MM-DD`.
 *
 * Uses the local getters rather than `toISOString().slice(0, 10)`, which is a
 * common and silent bug: `toISOString` converts to UTC first, so anywhere east
 * of Greenwich the early hours of the morning report yesterday, and anywhere
 * west the late evening reports tomorrow.
 *
 * Deliberately independent of `Intl`. `getFullYear`/`getMonth`/`getDate` read the
 * offset the OS gives the engine, which is reliable on Hermes; `Intl`'s timezone
 * database is not — see `deviceTimeZone` below.
 */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * A calendar date shifted by whole days, in and out as `YYYY-MM-DD`.
 *
 * Built at **noon**, not midnight. On a spring-forward DST boundary some zones
 * have no 00:00 at all — Asia/Beirut and several South American zones shift at
 * midnight — and `new Date(y, m, d)` then silently lands on the previous or next
 * day. Noon is at least eleven hours from any real-world transition, so the
 * arithmetic stays on the date it was given.
 *
 * `setDate` handles month and year boundaries, including leap days, so there is
 * no wraparound arithmetic here to get wrong.
 */
export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day, 12);

  shifted.setDate(shifted.getDate() + days);
  return localDateString(shifted);
}

/** Short weekday label for a `YYYY-MM-DD` date, e.g. "Mon". */
export function weekdayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, { weekday: 'short' });
}

/** Long form for display, e.g. "Sunday 2 August". */
export function longDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * The device's IANA timezone name, or null when it cannot be trusted.
 *
 * Hermes has a long history of not exposing the platform timezone to `Intl`,
 * returning `"UTC"` on every device regardless of where it is. **Measured on
 * device 2026-08-02: that is no longer true on React Native 0.81.** An
 * Asia/Kolkata phone returned `"Asia/Calcutta"` — the real zone, under its
 * legacy alias rather than the canonical name.
 *
 * The alias is not worth normalising. Postgres accepts it: it is present in
 * `pg_timezone_names`, carries the same +05:30 offset as `Asia/Kolkata`, and the
 * two are interchangeable in `at time zone`. Mapping aliases here would mean
 * shipping and maintaining a copy of the tz backward file to produce a value the
 * database already treats as identical.
 *
 * The null path is kept regardless, because it is not only about Hermes: `Intl`
 * can be absent from a minimal engine build, and a future engine could regress.
 *
 * `"UTC"` is treated as "no answer" even though it is a legitimate zone. A user
 * genuinely in UTC loses nothing: the column already defaults to `'UTC'`, so the
 * stored value is identical either way. Recording a *wrong* zone is the outcome
 * worth avoiding, because server-side day boundaries will trust it.
 */
export function deviceTimeZone(): string | null {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!resolved || resolved === 'UTC') {
      return null;
    }
    return resolved;
  } catch {
    // `Intl` missing entirely is a valid outcome on a minimal engine build.
    return null;
  }
}
