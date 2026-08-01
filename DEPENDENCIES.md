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

M1a used only `react-native`, `react-native-safe-area-context` and `@expo/vector-icons`.
`package.json`, `pnpm-lock.yaml` and `app.json` were unchanged, no `android/` or `ios/`
directory was generated, and Expo Go compatibility was preserved.

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
