---
name: max-dependency-gate
description: Review any proposed package, SDK, plugin, CLI, service, component library, or version change before installation in MAX. Use before pnpm add/remove/update, Expo package installation, native modules, UI frameworks, MCP servers, or global tools.
---

# MAX dependency gate

Do not install during review.

Return:

1. Exact feature requirement and whether existing code/Expo SDK can satisfy it.
2. Candidate package and no-package alternative.
3. Official maintainer docs/repository checked and date.
4. Compatibility with current Expo SDK, React Native, Node, TypeScript and Expo Go.
5. Whether it requires native configuration, development build, prebuild, account or paid service.
6. Maintenance signals: current release, supported version, unresolved critical issues and license.
7. Runtime, bundle, transitive dependency, storage and download implications where knowable.
8. Security/privacy surface and secrets involved.
9. Exact project-local install command using pnpm/`expo install` only after approval.
10. Verification and clean rollback steps.
11. Proposed `DEPENDENCIES.md` entry and ADR when architectural.

Reject stale, abandoned, duplicate, unnecessary or undocumented dependencies.
