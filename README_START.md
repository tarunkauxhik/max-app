# MAX starter pack

This is a living control plane for building **MAX** with Claude Code, Expo and Supabase.
It intentionally does not freeze every dependency or feature before development.

## Core rule

Lock the workflow, safety checks and quality gates. Re-evaluate implementation choices when each feature begins.

## Use

1. Create the Expo project first.
2. Keep Expo-generated `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json`.
3. Copy this pack into the project root.
4. Append `AGENTS_APPEND.md` to the generated `AGENTS.md`.
5. Merge `settings.recommended.json` into the generated `.claude/settings.json`; do not overwrite it.
6. Commit the baseline before feature work.

## Living documents

Update these after verified milestones:

- `PRODUCT.md`: current product hypothesis and scope.
- `DECISIONS.md`: accepted architecture decisions and alternatives.
- `DEPENDENCIES.md`: approved packages and why they exist.
- `LEARNINGS.md`: repeated errors, device quirks and proven fixes.
- `ROADMAP.md`: next small validated slice.

Skills must propose changes to these documents when reality changes. They must not silently rewrite product or architecture decisions.

## Security note

Claude permission rules are guardrails, not a substitute for OS isolation. Keep server secrets outside the mobile repository and never approve shell commands that expose credential files.
