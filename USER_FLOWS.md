# User flows

Living document. Describes what the app does **now**, not what it will do. Update it in the
same commit as any navigation or flow change.

Status as of M1e (2026-08-02): every flow below is static. No backend, no auth, no persistence.
All state is in memory and resets on a full reload.

## Screen map

```
RootLayout  app/_layout.tsx
├─ OnboardingProvider ─ SessionGoalProvider ─ ThemeProvider
│
├─ guard !completed ──▶ onboarding/                    anchor: index
│    │
│    1 index ──────▶ 2 interests ──▶ 3 commitment ──▶ 4 review
│      │ Get started    ≤3 of 6         one of 3        Edit ──dismissTo──┐
│      │                                                 │               │
│      │                                    complete(draft) ─────────────┘
│      └─ Skip for now ──────────────────────────────────┐
│                                                        ▼
└─ guard completed ───▶ (tabs)/                      Today
     │
     ├─ index     Today      live session state
     ├─ insights  Insights   fixture, labelled sample data
     └─ profile   Profile    fixture + onboarding answers read back
     │
     └─ goal/                pushed above the tabs, native header
          1 name ──▶ 2 time ──▶ 3 plan ──▶ 4 review
            text       chips      chips     Edit ──dismissTo──┐
                                             │                │
                                  saveGoal(draft) ────────────┘
                                             │
                                   dismissTo('/') ──▶ Today
```

## Onboarding

Runs once per session. Cannot be bypassed: the tab tree is not mounted while `completed` is
false (ADR-008), so hardware back on step 1 exits the app rather than revealing Today.

| Step | Screen | Input | Rule |
|---|---|---|---|
| 1 | `onboarding/index` | — | "Get started" or "Skip for now" |
| 2 | `onboarding/interests` | 1–3 of 6 interests | Unselected options disable at 3 |
| 3 | `onboarding/commitment` | one of light / regular / serious | — |
| 4 | `onboarding/review` | — | "Enter MAX" disabled until both are set; the hint names what is missing |

Skipping sets `completed` without preferences. Profile then shows "Onboarding — Skipped".

Selections survive backward navigation, because `OnboardingDraftProvider` is mounted in the
group layout rather than in a screen (ADR-007). After completion the group unmounts, so there
is no onboarding entry left in the history stack.

## Goal creation

Reached from Today's empty state. Four steps, one text input, everything else chips — the
fewer keyboard interactions, the fewer ways an Android soft keyboard can obscure a footer.

| Step | Screen | Input | Validation |
|---|---|---|---|
| 1 | `goal/name` | title | 3–60 characters, `validateTitle` |
| 2 | `goal/time` | minutes per day | one of 10 / 20 / 30 / 45 / 60 |
| 3 | `goal/plan` | duration + difficulty | one of 2 / 4 / 8 / 12 weeks; gentle / steady / intense |
| 4 | `goal/review` | — | "Confirm goal" disabled until all four are set |

Errors appear inline on Continue, not while typing. Edit on the review step uses `dismissTo`,
so returning does not stack a duplicate screen. Confirming calls `saveGoal` and returns to
Today with `dismissTo('/')`.

## Today

The only screen showing live state.

- **No goal** — empty state and "Create a goal". This is the cold-start view.
- **Goal set** — the goal, its derived actions, a progress bar, check-in, and "Clear goal".

Actions come from `deriveActions` in `features/today/actions.ts`, not a fixture: showing an
invented goal next to a real one was the defect M1e existed to fix (ADR-009). Check-in enables
only when every action is complete, and un-toggling an action resets it. Clearing the goal
clears its progress too.

No streak is shown. A session-only goal cannot have one, and a permanent zero would be noise.

## Insights and Profile

Both render fixtures and both say so, using `SAMPLE_DATA_NOTE` verbatim (ADR-009).

Insights runs a simulated 600 ms load so the loading path is a real state. Its `error` variant
is declared but never produced — there is nothing to fail yet.

Profile's only live content is the "From onboarding" group. Every other row is inert: a `View`
with the `text` role, no chevron, and a visible "Coming later". Sign out and Delete account are
inert too, with the danger tone, a "Danger zone" heading, a warning line and a consequence hint
— four signals, never colour alone.

## Known limitations

| Limitation | Reason |
|---|---|
| Everything resets on reload | No persistence (ADR-005, ADR-007) |
| Actions are derived, not planned | AI planning is a later milestone |
| Insights and Profile are fixtures | No account, no history (ADR-009) |
| No error or retry UI | Nothing can fail yet; the shape is agreed (ADR-009) |
| "Today" comes from the device clock | Needs a server-side day boundary — see ROADMAP |
