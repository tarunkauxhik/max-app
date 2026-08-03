# Security model

What protects MAX data, what does not, and where the gaps currently are. Written at M4, when the app
first gained real accounts. Revise it whenever a milestone changes the trust boundary.

The rule this document exists to make concrete: **the mobile client is untrusted.** Every copy of the
app ships to a device its owner fully controls, so anything the client decides can be changed by
whoever holds the phone. Authorization is whatever the database enforces, and nothing else.

## Trust boundary

| Zone | Contents | Trusted? |
|---|---|---|
| Device | The Expo bundle, the publishable key, the session token, the local onboarding record | **No.** Readable and modifiable by the device owner |
| Network | HTTPS to `https://<ref>.supabase.co` | In transit only, via TLS |
| Supabase | Postgres, RLS policies, column grants, GoTrue auth | **Yes.** This is where authorization lives |
| Nowhere yet | Any server code we write | n/a — MAX has no backend of its own |

Everything the app can do, an attacker with the app can also do. The question is never "can they send
that request" but "what does the database do when they send it".

## Keys

Two Supabase keys exist and they are not interchangeable.

| Key | Where it may go | Why |
|---|---|---|
| `sb_publishable_…` | The client bundle, `.env`, this repository's `.env.example` as a placeholder | It identifies the project, it does not authorize anything. Every request it carries is still evaluated by RLS against the caller's JWT |
| `sb_secret_…` | A password manager. Later, server-side configuration only | **Bypasses RLS entirely.** In a bundle it would give every user full read and write access to every other user's data |

The publishable key being safe to expose does not make it safe to *commit* — it is read from a
gitignored `.env` so that rotating it, or pointing a build at a different project, is not a code
change. See ADR-011.

`lib/supabase.ts` enforces this at module load rather than trusting the operator:

- missing URL or key → throw, with the fix in the message;
- key starting `sb_secret_` → throw, and instruct that the key be treated as disclosed and rotated;
- key not starting `sb_publishable_` → throw, because legacy `anon` JWTs are deprecated.

A `.env` mistake therefore fails on the first launch, loudly, instead of shipping.

### Do not audit a bundle by grepping it

`grep sb_secret_` on an exported Android bundle returns a match even when nothing leaked:
`@supabase/supabase-js` ships that literal itself inside `isNewApiKey`, and Hermes packs its string
table without separators, so a longer regex matches across pooled strings too. Worse, the check would
return *nothing* against a value that was re-encoded or split.

The real guarantee is the inlining boundary. Metro substitutes **only** `EXPO_PUBLIC_*` variables into
a build; `expo export` prints exactly which ones it exported, and for this project that is
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nothing else in `.env` can
reach a bundle by any path, so the only way a secret leaks is by being stored in the publishable
variable — which is precisely what the load-time guard rejects. See LEARNINGS.

## What the database enforces

Established in M3 and verified by 170 pgTAP assertions against `max-dev`, including a two-user
isolation file. See ADR-012.

- **RLS is enabled on all four tables** — `profiles`, `goals`, `goal_actions`, `check_ins` — with 13
  policies, all of which restrict rows to `(select auth.uid()) = user_id`.
- **`anon` holds zero privileges.** A request with no session cannot read anything.
- **`authenticated` holds SELECT on all four tables, DELETE on `goal_actions` and `check_ins` only,
  and UPDATE on exactly 20 columns.** No `id`, `user_id`, `created_at` or `updated_at` column is
  updatable by a client.
- **Ownership cannot drift.** Child tables carry `user_id` and their foreign key points at
  `goals (id, user_id)`, so re-parenting a row to another user's goal is rejected by the key itself
  rather than by a policy that has to remember to check.

### Exercised from the app since M5a

Until M5a this section described a database no client code touched. It now
describes the enforcement behind every screen, verified from the app rather than
only from pgTAP:

- **Two accounts on one device, checked on hardware (2026-08-02).** Account B signed in and saw its
  own empty Today, its own goal, its own actions and its own profile answers. Account A's goal,
  progress and check-in were untouched afterwards. This is the app-level counterpart to pgTAP `004`,
  and it closes the TEST_MATRIX "unauthorized row access" row that M4 could not.
- **Measured server-side afterwards**, rather than inferred from the UI: zero `goal_actions` and zero
  `check_ins` whose `user_id` differs from their parent goal's owner, and zero duplicates against
  either uniqueness constraint. The composite foreign key makes drift structurally impossible; the
  query confirms it rather than trusting that.
- **Every write is scoped twice** — by an explicit `.eq('user_id', …)` in the query and by the policy
  on the table. The filter is convenience; the policy is the control. A client that dropped the
  filter would still reach only its own rows.

**RLS answers "which rows". It never answers "which columns".** An UPDATE that satisfies
`user_id = auth.uid()` is a legitimate row for that user, so without column grants it could rewrite
server-owned columns on its own data. That is what the grants are for, and why a forgotten grant shows
up as a client write failing rather than as a silent hole.

An earlier version of the migrations got this wrong — Supabase's default privileges granted ALL on new
`public` tables to `authenticated`, and the migration revoked only from `public` and `anon`. Grants
are a union, never a ceiling. Fixed in `20260802100400`; RLS was never bypassed, and no user could
reach another user's rows at any point. See LEARNINGS.

## What the client does not enforce

`features/auth/validation.ts` checks email shape and an 8-character minimum password **before**
submitting. This is a user-experience feature. It exists so a typo does not cost a network round trip,
and it is worth nothing as security — the server is the authority on password strength, and its
threshold is a dashboard setting that can change without a release, which is why the client's
`weak_password` message deliberately quotes no number.

The same applies to every guard in the UI. `Stack.Protected` in `app/_layout.tsx` decides what to
*render*; it decides nothing about what the database will answer.

## Session tokens on the device

The Supabase refresh token is stored by `expo-sqlite/kv-store` in a SQLite file inside app-private
storage. **It is not encrypted at rest.** On a non-rooted Android device the OS sandbox keeps other
apps out of that directory, which is the actual protection. On a rooted or physically compromised
device, the token is readable, and holding it is equivalent to being signed in until it is revoked.

`expo-sqlite`'s `useSQLCipher` flag would encrypt the store, but it is a config-plugin option that only
takes effect in a native build — unavailable while the project runs in Expo Go. See ADR-013 for the
full trade-off and the trigger to revisit it: **before M11, when an APK is distributed to anyone.**

Auto-refresh runs only while the app is in the foreground (`AppState` in `lib/supabase.ts`), so a
backgrounded app is not quietly renewing credentials.

## Data kept on the device

| Data | Where | Cleared on sign-out? |
|---|---|---|
| Session and refresh token | `expo-sqlite` KV store | **Yes** — `signOut()` clears it |
| Onboarding completion and answers (interests, daily commitment) | `expo-sqlite` KV store, key `max.onboarding.v1.<user id>` | **No — deliberately** |
| The in-progress goal | Memory only | Yes, on account change and on any restart |

Onboarding answers surviving sign-out is a choice, not an oversight: it is what stops the four-step
flow replaying every time someone signs back in. The consequence is that a shared device retains one
account's interests after that account signs out. They are keyed per user id, so the next account
cannot read them through the app — but they are on the disk, unencrypted, until the app is
uninstalled.

This becomes a genuine defect the moment account deletion exists, and is listed below as such.

## User enumeration

Sign-up on `max-dev` will tell an attacker whether an email address has an account. Attempting to
register an existing address returns `user_already_exists`, which the app renders as "An account
already uses that email."

This is a direct consequence of turning **Confirm email OFF** (EXTERNAL_SETUP_TRACKER). Supabase's own
reference notes that "if a user account exists in the system you may get back an error message that
attempts to hide this information from the user" — that obfuscation applies when confirmation is
enabled. With it disabled, the error is plain. Verified on device 2026-08-02.

Accepted for a development-only project with no real users. **Re-enabling Confirm email before M11 is
the mitigation, and is already recorded as an M11 precondition.**

Sign-in does not leak the same way: `user_not_found` is mapped to the identical message as
`invalid_credentials` in `features/auth/errors.ts`, so a failed sign-in never distinguishes "wrong
password" from "no such account". That mapping is currently unreachable — Supabase returns
`invalid_credentials` for an unknown email — and is written safely now because a password-reset flow
would reach it.

## Errors and logging

- `describeAuthError` maps Supabase **error codes**, taken from the `ErrorCode` union in
  `@supabase/auth-js@2.111.0`, to fixed strings. It never falls back to `error.message`, because raw
  strings can name internal components and change between releases.
- **The app contains no `console.*` calls at all.** No token, password, email or session object is
  written to any log, and there is no analytics SDK installed to receive one.
- Rate limiting is server-side. The client has no retry loop; `over_request_rate_limit` and
  `over_email_send_rate_limit` are surfaced to the user and the attempt stops there.
- Duplicate submission is blocked twice in `features/auth/auth-form.tsx` — a synchronous `if (busy)
  return;` and a `disabled` button — so a double tap cannot produce two sign-up requests.

## Known gaps at M4

Recorded rather than implied. Each names where it is addressed.

| Gap | Impact | Where it lands |
|---|---|---|
| Session token unencrypted at rest | Readable on a rooted or compromised device | Before M11 — needs a development build for `useSQLCipher`. ADR-013 |
| Sign-up reveals whether an email is registered | Membership enumeration | Re-enable Confirm email before M11 |
| Onboarding answers persist after sign-out | Data retained on a shared device | **Partly addressed in M5a:** `profiles` is now the source of truth and the device copy is a cache for the route guard. It is still written per user id, still unencrypted, and still not cleared on sign-out — deliberately, so re-signing-in does not replay the flow |
| Account deletion is not implemented | The Profile row is inert and says "Coming later" | Must cover: database rows (M3's `ON DELETE CASCADE` handles these), the auth user, active sessions, **and the local onboarding key**, which nothing currently deletes |
| Expired-session behaviour untested | Unknown UX when a refresh token is finally rejected | M6, with the offline and refresh work |
| A failed background write is not retried until the next launch | Onboarding answers can sit unsynced; the device cache keeps the app working meanwhile | M6, which adds real retry and offline queueing |
| No password reset | A locked-out user has no route back | Not scheduled; needs email delivery, so it follows re-enabling Confirm email |

## Rules for future work

- Never add a `console.log` of a session, token, password or email address.
- Any new table gets RLS **and** column grants, and the migration must `revoke all` from
  `authenticated` first — a grant that looks right in a migration file proves nothing.
- Verify privileges against `information_schema`, not against the SQL that was intended to set them.
- Every new policy needs a pgTAP assertion with two users. Code inspection is not evidence.
- A secret that reaches chat, a log or a commit is disclosed, and is rotated regardless of whether
  misuse is suspected.
