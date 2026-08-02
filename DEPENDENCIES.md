# Dependency register

No package is approved only because an AI suggested it.

## Baseline

Exact versions come from the generated Expo SDK project and its lockfile.

| Package/group | Purpose | Status |
|---|---|---|
| Expo + React Native + TypeScript | App framework | approved |
| Expo Router | Navigation | approved |
| Official Expo SDK libraries | Device/UI capabilities | add only when needed |
| Supabase JS | Backend client | pending backend milestone |
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
removing them in M1f — `expo-image` in particular is the recommended image component and is
likely to be wanted again when proof images arrive.

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
