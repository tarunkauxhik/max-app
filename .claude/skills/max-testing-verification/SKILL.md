---
name: max-testing-verification
description: Create or execute MAX verification plans for code, UI, auth, backend, caching, permissions, performance, regressions, builds, APKs, and releases. Use after each feature and before commit/push.
---

# MAX testing and verification

1. Map each acceptance criterion to a test.
2. Run the smallest relevant static/unit checks first; do not hide or suppress failures.
3. Require manual physical-Android verification for user-facing changes.
4. Test iOS through Expo Go when the feature is supported and an iPhone is available; state limitations.
5. Cover happy, empty, loading, invalid, denied, offline, slow, retry, duplicate and restart states as applicable.
6. Auth/data work requires two-user and unauthorized-access tests.
7. Use accessible labels/test IDs where automation needs stable selectors, not brittle coordinates.
8. Add `agent-device` only when visual/device automation becomes valuable; use its installed version help as source of truth.
9. Performance evidence must state device, debug/release mode, scenario and measurement.
10. Return exact evidence and remaining risk. Manual success is required before commit/push of a milestone.
