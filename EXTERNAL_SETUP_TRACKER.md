# External setup tracker

Do not paste secret values into chat or commit them.

| Service | Account/project | Status | Non-secret identifiers | Last verified |
|---|---|---|---|---|
| Expo | | not started | | |
| GitHub | tarunkauxhik | ready | repository URL after creation | |
| Supabase | max-dev | development only | project ref, region | 2026-08-02 |
| Email provider | | not started | sending domain only | |
| AI provider | | not started | model name only | |

Every setup step must include exact dashboard actions, expected result and a non-secret verification output.

## Supabase — max-dev

| Field | Value |
|---|---|
| Project name | `max-dev` |
| Plan | Free |
| Region | South Asia (Mumbai), `ap-south-1` |
| Project ref | `smdpqbdpkmahnhewiwqq` |
| API URL | `https://smdpqbdpkmahnhewiwqq.supabase.co` |
| Created | 2026-08-02 |
| Status | Development only. Never connect AI tooling or production data to it. |

The project ref is a public identifier: it forms the API URL `https://<ref>.supabase.co`, which
is bundled into every client build. Recording it here is intentional and safe. Find it under
**Project Settings → General → Reference ID**; it also appears in the dashboard URL.

**Non-secret verification (2026-08-02):** an unauthenticated `GET` to
`https://smdpqbdpkmahnhewiwqq.supabase.co/rest/v1/` returned **HTTP 401**. That confirms the ref
is correct, the project is awake rather than paused, and the API gateway rejects requests that
carry no key. Repeat this check after any suspected pause — a paused project does not answer.

### Credentials — none are stored in this repository

| Credential | Where it lives | Notes |
|---|---|---|
| Database password | Password manager only | Never in the repo, never in chat, never in the client |
| `sb_secret_…` | Password manager; later, server-side config only | Bypasses RLS entirely. Reaches no Expo bundle, ever |
| `sb_publishable_…` | Local `.env`, which git ignores | Safe to expose, but still not committed |

Legacy `anon` and `service_role` JWT keys are deprecated by the end of 2026. This project uses
the current `sb_publishable_` / `sb_secret_` format.

Any credential that reaches chat, a log or a commit is treated as disclosed and rotated, whether
or not misuse is suspected. Secret keys rotate at **Project Settings → API Keys**; the database
password at **Project Settings → Database → Reset database password**.

### Free plan constraints that affect development

- **Projects pause after 7 days without API requests.** A paused project fails every request
  until it is manually restored from the dashboard. Expect this after a break.
- 500 MB database, 1 GB file storage, 5 GB egress, 2 active projects.
- No backups on Free. Treat `max-dev` as disposable; committed migrations are the real source
  of truth.

_Verified against Supabase documentation on 2026-08-02._
