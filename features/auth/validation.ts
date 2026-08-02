/**
 * Client-side credential checks, in the same shape as `validateTitle` in
 * `features/goals/types.ts`: return a message, or null when valid.
 *
 * These are UX, not security. The server is the authority on every rule here —
 * `features/auth/errors.ts` maps its verdict back to a message. The point of
 * validating locally is to avoid spending a network round trip, and on this
 * project a sign-up attempt, on a mistake the user can see before submitting.
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Deliberately permissive. The valid-address grammar is far wider than the
 * "one @, one dot" rule most clients implement, and rejecting a real address is
 * a worse failure than sending one request that the server refuses with
 * `email_address_invalid`. This catches typing mistakes, nothing more.
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return 'Enter your email address';
  }
  if (/\s/.test(trimmed)) {
    return 'Email addresses cannot contain spaces';
  }

  const at = trimmed.indexOf('@');
  // Needs something before the @, something after it, and exactly one of them.
  if (at <= 0 || at === trimmed.length - 1 || trimmed.indexOf('@', at + 1) !== -1) {
    return 'Enter a valid email address';
  }
  return null;
}

/**
 * Only length is checked. `PASSWORD_MIN_LENGTH` is 8, which is stricter than the
 * project's server minimum of 6, so anything accepted here is accepted there.
 * Composition rules are left to the server: `weak_password` comes back with the
 * server's own reasoning, and duplicating that here would mean two sources of
 * truth that drift apart the moment the dashboard setting changes.
 */
export function validatePassword(password: string): string | null {
  if (password.length === 0) {
    return 'Enter a password';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  return null;
}
