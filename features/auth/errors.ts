import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Turns a Supabase auth failure into something worth showing a person.
 *
 * Supabase's own messages are written for developers reading logs — "Invalid
 * login credentials", "User already registered" — and several are ambiguous
 * about what the reader should do next. The codes are the stable part of the
 * contract; the prose is not, and changes between releases.
 *
 * Every code below was taken from the `ErrorCode` union in
 * `@supabase/auth-js@2.111.0`, verified 2026-08-02, rather than from memory.
 */

const MESSAGES: Record<string, string> = {
  // Sign in
  invalid_credentials: 'That email and password do not match. Check both and try again.',
  email_not_confirmed: 'Confirm your email address first. Check your inbox for the link.',
  // Deliberately identical to `invalid_credentials`. A distinct "no account uses
  // that email" message would let anyone test an address for membership one
  // request at a time. Supabase returns `invalid_credentials` for an unknown
  // email today, so this is unreachable from sign-in — but a password-reset flow
  // would reach it, and the message should already be safe when it does.
  user_not_found: 'That email and password do not match. Check both and try again.',
  user_banned: 'This account has been suspended.',

  // Sign up
  user_already_exists: 'An account already uses that email. Sign in instead.',
  email_exists: 'An account already uses that email. Sign in instead.',
  signup_disabled: 'New accounts are not being accepted right now.',
  email_provider_disabled: 'Email sign-up is turned off for this app.',
  email_address_invalid: 'That does not look like a valid email address.',
  email_address_not_authorized: 'That email address is not permitted.',

  // Password rules. The server is the authority on these, not the client, and
  // its exact threshold is a dashboard setting that can change without a
  // release — so this message deliberately does not quote a number.
  weak_password: 'That password is too weak. Try a longer one, or add more variety.',
  same_password: 'That is already your current password.',

  // Rate limits. The free plan sends 2 auth emails per hour, so this is a
  // routine outcome during development rather than an edge case.
  over_email_send_rate_limit:
    'Too many emails have been sent recently. Wait an hour and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a moment and try again.',

  validation_failed: 'Something in that form was not accepted. Check your entries.',
};

const NETWORK_MESSAGE =
  'Cannot reach the server. Check your connection and try again.';

const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

export function describeAuthError(error: unknown): string {
  // Checked first: a retryable fetch failure carries no useful code, and
  // offline is the single most likely failure on a phone.
  if (isAuthRetryableFetchError(error)) {
    return NETWORK_MESSAGE;
  }

  if (isAuthApiError(error) && error.code) {
    const known = MESSAGES[error.code];
    if (known) {
      return known;
    }
  }

  // Deliberately not falling back to error.message. Supabase's raw strings can
  // name internal components, and an unrecognised code means we have not
  // decided how to describe it — a generic message is more honest than a
  // developer one.
  return FALLBACK_MESSAGE;
}
