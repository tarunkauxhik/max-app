# MAX project rules

## Required context

Read before planning or editing:

- `info.md`
- `PRODUCT.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `DEPENDENCIES.md`
- `QUALITY_GATES.md`
- relevant source and test files

## Safety

- Use pnpm only.
- Never install globally from a project task.
- Never expose, read, print, commit or request secret values.
- Never run `expo prebuild`, `expo run:*`, Gradle, EAS Build, deployment, destructive cleanup or dependency upgrades without explicit approval.
- Before any package addition, invoke `max-dependency-gate` and verify current official documentation.
- Before Supabase work, invoke `max-supabase-backend`; before auth/security work also invoke `max-security-review`.
- Do not connect AI tools to production data.
- Do not modify unrelated files.

## Workflow

1. Inspect current code and docs.
2. Return a plan with files, dependencies, risks, test plan and rollback.
3. Wait for approval.
4. Implement the smallest complete slice.
5. Run available static checks.
6. Provide exact manual tests.
7. Wait for the user's test result.
8. Commit and push only after verification.

## Quality

- TypeScript strict; no unexplained `any`, ignored errors or disabled checks.
- Every async flow needs loading, empty, error, retry and duplicate-action behavior where relevant.
- Use existing design tokens and components before creating new ones.
- Accessibility labels, roles, touch targets and reduced-motion behavior are required.
- Server-enforced authorization, quotas and validation are required; frontend checks are not security.
- Prefer simple code and project-local dependencies.

## Current-information rule

For version-sensitive APIs, libraries, quotas, CLI commands or platform behavior, consult the official current documentation or installed CLI help. State what was verified and the date. Do not rely only on model memory.
