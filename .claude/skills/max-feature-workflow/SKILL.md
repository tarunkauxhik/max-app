---
name: max-feature-workflow
description: Plan and implement a MAX app feature as a small verified slice. Use for any new feature, refactor, bug fix, architecture change, or milestone. Enforces inspect-plan-approve-implement-test-git workflow, narrow diffs, living docs, current-source verification, and rollback.
---

# MAX feature workflow

1. Read `PRODUCT.md`, `ROADMAP.md`, `DECISIONS.md`, `DEPENDENCIES.md`, `LEARNINGS.md`, `QUALITY_GATES.md` and relevant code.
2. Inspect git status and existing implementation. Do not assume the prompt describes the current code accurately.
3. Plan the smallest complete user-visible slice. Include files, dependency impact, risks, tests, rollback and docs updates.
4. For version-sensitive facts, use official current docs or installed CLI help and state the source/date.
5. Wait for approval before edits.
6. Implement only the approved slice. Do not opportunistically refactor unrelated code.
7. Run approved checks. Give manual Android/iOS steps and stop for user evidence.
8. Propose a focused commit only after verification. Never push without explicit approval.
9. Update `DECISIONS.md`, `DEPENDENCIES.md` or `LEARNINGS.md` only when the change is verified.

Invoke other MAX skills when their domain is involved.
