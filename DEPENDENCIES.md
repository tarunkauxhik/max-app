# Dependency register

No package is approved only because an AI suggested it.

## Baseline

Exact versions come from the generated Expo SDK project and its lockfile.

| Package/group | Purpose | Status |
|---|---|---|
| Expo + React Native + TypeScript | App framework | approved |
| Expo Router | Navigation | approved |
| Official Expo SDK libraries | Device/UI capabilities | add only when needed |
| Supabase JS | Backend client | **approved 2026-08-02** (M4). See below |
| TanStack Query | Server-state cache | pending data milestone |
| Expo SQLite | Persistent cache/offline data | **approved 2026-08-02** (M4, ahead of the cache milestone). See below |
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
| M4 email authentication | `@supabase/supabase-js@^2.111.0`, `expo-sqlite@~16.0.10` | none | First runtime packages added since M0. Both ship in Expo Go. See below. |

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

## Runtime packages — approved 2026-08-02 (M4)

The first packages added to the running app since the M0 template. Installed with
`pnpm exec expo install @supabase/supabase-js expo-sqlite`, so the SDK 54 compatible releases were
chosen rather than merely the newest.

### `@supabase/supabase-js`

| Field | Value |
|---|---|
| Version | `^2.111.0`, resolved to 2.111.0 |
| Requirement | Sign-up, sign-in, sign-out and session refresh against `max-dev`. Nothing in Expo SDK 54 speaks to Supabase Auth |
| No-package alternative | Hand-written `fetch` calls to the GoTrue REST endpoints. Rejected: it would mean reimplementing token refresh, expiry handling and storage adapters, which is the majority of what this package is |
| Sources checked | npm registry metadata and the installed `package.json`; Expo's own Supabase guide for SDK 54 — 2026-08-02 |
| Compatibility | Pure JavaScript, **no native module**. Works in Expo Go with no config plugin and no prebuild. `engines: node >=22.0.0`; the project runs 24.18.1 |
| Native/paid | None. `max-dev` is on the Supabase Free plan |
| Maintenance | Actively released; 2.111.0 was the current release at install time |
| License | MIT |
| Secrets | Reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only, both of which are safe in a client bundle by design. `lib/supabase.ts` throws at module load if the key is missing or carries the `sb_secret_` prefix. See SECURITY.md |
| Bundle impact | The only new runtime JavaScript of consequence in M4. It ships the string `sb_secret_` itself inside `isNewApiKey`, which is a known false positive when grepping a bundle — see LEARNINGS |
| Rollback | `pnpm remove @supabase/supabase-js`, delete `lib/supabase.ts` and `features/auth/`, and revert the gating in `app/_layout.tsx` |

### `expo-sqlite`

| Field | Value |
|---|---|
| Version | `~16.0.10`, resolved to 16.0.10 |
| Requirement | A storage adapter for the Supabase session, so a signed-in user is still signed in after a force-quit. Also the per-account onboarding flag |
| No-package alternative | None workable. React Native ships no persistent key–value store, and Supabase's `persistSession` needs one; without it every launch starts signed out |
| Sources checked | `docs.expo.dev/versions/v54.0.0/sdk/sqlite`, plus the installed export map and config-plugin types — 2026-08-02 |
| Compatibility | First-party Expo SDK module, **bundled into Expo Go**. Pinned by `expo install` to the SDK 54 release, deliberately not the newer 57.x that targets a later SDK |
| Native/paid | No prebuild needed for what is used here. `expo install` added a bare `"expo-sqlite"` entry to `app.json`; its config plugin accepts only native build flags — `customBuildFlags`, `enableFTS`, `useSQLCipher`, `useLibSQL`, `withSQLiteVecExtension` — none of which are passed, so the entry is inert in Expo Go. Verified against `plugin/build/withSQLite.d.ts` |
| Maintenance | First-party, released on the Expo SDK cadence |
| License | MIT |
| Secrets | **Stores the Supabase refresh token unencrypted at rest**, in app-private storage. `useSQLCipher` would encrypt it but is a native build flag, so it is unavailable until a development build exists. See ADR-013 and SECURITY.md |
| Storage impact | One small SQLite file. The session is a few kilobytes; the onboarding record is under 200 bytes per account |
| Rollback | `pnpm remove expo-sqlite`, remove the `app.json` plugin entry, and delete `features/onboarding/storage.ts`. Sessions then stop surviving a restart |

**Two subpaths, and only one of them is typed.** The code imports `expo-sqlite/kv-store`, not the
`expo-sqlite/localStorage/install` shim Expo's Supabase guide shows. `kv-store` declares both
`default` and `types` in its export map; `localStorage/install` declares only `default`. The shim
route still typechecks, but its types come from the wrong place: the module itself contributes none,
and the global `localStorage` it installs is described by the DOM `Storage` interface that
`expo/tsconfig.base` pulls in. That happens to be structurally compatible with what Supabase wants,
so nothing complains — but the guarantee is a browser type definition in a React Native app, not
anything `expo-sqlite` ships. See ADR-013.

**This satisfies M6 too.** DEPENDENCIES previously listed Expo SQLite as pending the cache milestone.
It is now installed, so M6 adds no storage package — it reuses this one.

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
