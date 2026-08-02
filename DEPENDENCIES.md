# Dependency register

No package is approved only because an AI suggested it.

## Baseline

Exact versions come from the generated Expo SDK project and its lockfile.

| Package/group | Purpose | Status |
|---|---|---|
| Expo + React Native + TypeScript | App framework | approved |
| Expo Router | Navigation | approved |
| Official Expo SDK libraries | Device/UI capabilities | add only when needed |
| Supabase JS | Backend client | pending M4 — service provisioned, package not yet installed |
| TanStack Query | Server-state cache | pending data milestone |
| Expo SQLite | Persistent cache/offline data | pending cache milestone |
| Zod | Boundary validation | pending first validated boundary |
| React Hook Form | Complex forms | pending form complexity |

## Milestone log

| Milestone | Added | Removed | Notes |
|---|---|---|---|
| M0 baseline | Expo SDK 54 template set | none | Exact versions fixed by `pnpm-lock.yaml`. |
| M1a design foundation | none | none | Built entirely on already-installed packages. |
| M1b static goal creation | none | none | Built on already-installed packages. |
| M1c static onboarding | none | none | Built on already-installed packages. |
| M1d static Insights and Profile | none | none | Built on already-installed packages. |
| M1e integration and UX audit | none | none | Deletions only. See the orphan note below. |
| M3 schema and RLS | `supabase@2.110.0` (dev) | none | CLI only. Never bundled. See below. |

M1a used only `react-native`, `react-native-safe-area-context` and `@expo/vector-icons`.
`package.json`, `pnpm-lock.yaml` and `app.json` were unchanged, no `android/` or `ios/`
directory was generated, and Expo Go compatibility was preserved.

M1b and M1c also added no packages. Commits `56a4c0a` and `91c6404` leave `package.json`,
`pnpm-lock.yaml` and `app.json` untouched, generate no `android/` or `ios/` directory, and
preserve Expo Go compatibility. M1d and M1e held the same constraints.

### Orphaned by M1e

Removing the Expo demo surface (ADR-010) left two packages with no importer:

| Package | Was used by | Status |
|---|---|---|
| `expo-web-browser` | `components/external-link.tsx` | orphaned, still installed |
| `expo-image` | `components/parallax-scroll-view.tsx` | orphaned, still installed |

They are deliberately **not** removed here: uninstalling edits `package.json` and
`pnpm-lock.yaml`, which M1e was scoped out of. Verify both are still unreferenced before
removing them later — `expo-image` in particular is the recommended image component and is
likely to be wanted again when proof images arrive.

## External services

| Service | Project | Plan | Region | Milestone | Notes |
|---|---|---|---|---|---|
| Supabase | `max-dev` | Free | `ap-south-1` | M2 | Development only. See ADR-011. |

Provisioning a service is not package approval. `@supabase/supabase-js` still passes the normal
dependency gate at M4, with its version, Expo SDK 54 compatibility and Expo Go behaviour
verified against current documentation at that time.

Free-plan limits that constrain design: 500 MB database, 1 GB storage, 5 GB egress, 2 active
projects, no backups, and automatic pausing after 7 days without API requests.

### supabase CLI — approved 2026-08-02

| Field | Value |
|---|---|
| Package | `supabase`, pinned to `2.110.0` |
| Type | **devDependency.** Never imported by app code, never bundled, never shipped |
| Requirement | Apply migrations to `max-dev` and run pgTAP. Nothing in Expo SDK 54 can do either |
| Sources checked | CLI getting-started, `db push` and `test db` references — 2026-08-02 |
| Compatibility | Needs Node ≥20; project runs 24.18.1. No effect on Expo Go, React Native or the bundle |
| Native/paid | No paid service. **Docker is required for `test db`, but not for `db push`.** Verified both ways: `db push --linked` applied all migrations with the Docker daemon stopped, emitting warnings about an optional catalog cache it could not build; `test db --linked` failed hard in that state, then ran the full 170-assertion suite once the daemon was started. It pulls `public.ecr.aws/supabase/pg_prove:3.36` on first use and runs `pg_prove` in a container even when the target is a remote project |
| Connection role | `db push` and `db query` connect as `postgres`. **`test db` connects as `cli_login_postgres`**, a restricted role with no CREATE on the database and no USAGE on `extensions`. Test files must `set role postgres`. See LEARNINGS |
| License | Apache-2.0, first-party Supabase |
| Secrets | `supabase login` stores an access token outside the repo; `link` takes the database password interactively. Neither enters git |
| Rollback | `pnpm remove supabase`, then delete `supabase/config.toml`, `supabase/.gitignore` and `supabase/.temp`. Applied migrations are reverted by their rollback SQL |

Pinned exactly rather than with a range, so every run of the migration and test suite uses the
same CLI. `2.111.0` was available at install time and was deliberately not taken: the version
that verifies the schema should be the version recorded alongside it.

`supabase init` also created `supabase/config.toml` and `supabase/.gitignore`. Neither excludes
the migrations or tests, which was checked rather than assumed.

## Required review for additions

Record:

- package and exact version;
- feature requiring it;
- official source checked and date;
- Expo SDK compatibility;
- maintenance/release status;
- native-build requirement;
- transitive/package-size impact;
- security and license notes;
- existing-package and no-package alternatives;
- removal/rollback method.
