# Decision log

Record decisions as they are made. Do not rewrite history; supersede an older decision with a new entry.

## Template

### ADR-000: title

- Date:
- Status: proposed | accepted | superseded
- Context:
- Decision:
- Alternatives considered:
- Consequences:
- Revisit when:

## Accepted baseline

### ADR-001: mobile framework

- Date: 2026-08-02
- Status: accepted
- Decision: React Native with Expo, TypeScript, Expo Router and pnpm.
- Consequences: begin in Expo Go; use cloud native builds only when a confirmed native requirement exists.

### ADR-002: backend direction

- Date: 2026-08-02
- Status: proposed
- Decision: Supabase is the preferred backend, subject to re-verification when backend work starts.
- Revisit when: requirements exceed the free tier or a feature has a materially better service.

### ADR-003: UI strategy

- Date: 2026-08-02
- Status: accepted
- Decision: branded project-owned design system using React Native/Expo primitives and official native controls. Evaluate third-party component systems per component need; do not install a full UI kit by default.

### ADR-004: design token and primitive layer

- Date: 2026-08-02
- Status: accepted
- Context: M1a needed a visual foundation that works in Expo Go with no native build and no custom font files.
- Decision: a project-owned semantic token module (`constants/tokens.ts`) with separate light and dark palettes, consumed through `hooks/use-theme.ts`, plus seven primitives in `components/ui/`. System font stack only. Any colour pair used for text or for a meaningful UI boundary must pass a deterministic WCAG 2.1 calculation before the palette changes: 4.5:1 ordinary text, 3:1 large text and control outlines.
- Alternatives considered: NativeWind, Tamagui and Unistyles (each contradicts ADR-003 and adds a dependency); extending the template `Colors` map directly (six keys, too thin to express state).
- Consequences: zero dependencies. The template `constants/theme.ts`, `ThemedText` and `ThemedView` stay in place for the untouched demo routes, so two text components coexist until those routes are replaced. `border` is decorative; `borderStrong` is the token that carries the 3:1 obligation.
- Revisit when: custom fonts are required (the SDK 54 config-plugin path embeds at build time and needs a prebuild), or a component need is not met by React Native primitives.

### ADR-005: local-only interface state during static milestones

- Date: 2026-08-02
- Status: accepted
- Context: the Today screen needed completion and check-in behaviour before any backend or storage exists.
- Decision: hold that state in React component state only. It resets on reload, and during static milestones that is intended rather than a defect.
- Alternatives considered: AsyncStorage or Expo SQLite now — both are premature, belong to the cache milestone in DEPENDENCIES.md, and would add a dependency M1a does not need.
- Consequences: device testing cannot verify persistence, and testers must expect state loss on reload. Any bug report about lost state before the persistence milestone is expected behaviour.
- Revisit when: the data and persistence milestone begins.

### ADR-006: development directly on main

- Date: 2026-08-02
- Status: accepted
- Context: single developer, small verified slices, every milestone gated by manual device testing before push.
- Decision: milestone work continues directly on `main`. No feature branches.
- Alternatives considered: a branch per milestone — overhead without a second reviewer, and the gate that matters here is device testing, not review.
- Consequences: rollback depends on focused, individually revertable commits and `git revert` rather than deleting a branch. This raises the stakes on the QUALITY_GATES rule that a diff contains only intended files.
- Revisit when: a second contributor joins, or a change cannot be delivered as a safely revertable commit.

### ADR-007: session state in layout-mounted context providers

- Date: 2026-08-02
- Status: accepted
- Context: M1b and M1c both needed a multi-step flow whose input survives backward navigation, plus a result that outlives the flow. ADR-005 established that static-milestone state is memory-only, but it was written for state inside one screen and does not say where cross-screen state should live. Both flows already cite ADR-005 in comments for exactly that.
- Decision: extend ADR-005 rather than supersede it. Draft state lives in a context provider mounted in that flow's `_layout.tsx` — `GoalDraftProvider`, `OnboardingDraftProvider` — so it stays mounted across steps and is discarded when the flow unmounts. State that must outlive a flow is mounted at the root layout: `SessionGoalProvider`, `OnboardingProvider`. All of it is still `useState`, and still resets on reload.
- Alternatives considered: route params (fragile under typed routes, and lost on backward navigation); a global store library (a dependency, and premature); persisting now (belongs to the cache milestone in DEPENDENCIES.md).
- Consequences: drafts need no explicit reset — unmounting the flow discards them. Root state is deliberately not persisted, so a reload restarts onboarding and clears the saved goal, and testers must expect that.
- Revisit when: the data and persistence milestone begins, or a third flow needs the same shape and the duplication becomes worth abstracting.

### ADR-008: route gating with Expo Router protected screens

- Date: 2026-08-02
- Status: accepted
- Context: onboarding must not be bypassable, and must not remain in the history stack after completion.
- Decision: gate route groups with `<Stack.Protected guard={...}>` in `app/_layout.tsx`, reading the onboarding flag from a provider mounted above the stack.
- Alternatives considered: a `<Redirect>` inside the tab layout — the tab tree still mounts first, so hardware back on the welcome screen would briefly reveal Today behind the gate.
- Consequences: the tab tree does not mount at all until onboarding passes, so back on the first onboarding screen exits the app, which is the intended Android behaviour. The stack must be split into a `RootStack` child component so it can read context from the provider above it.
- Revisit when: real auth is added and the guard must read a session rather than a memory flag.

### ADR-009: live session state versus labelled sample data

- Date: 2026-08-02
- Status: accepted
- Context: M1e found Today rendering the goal the user had just created *and* an unrelated fixture goal at the same time, and onboarding writing preferences that no screen read. Static milestones need invented data to show a designed screen, but a screen that mixes invented and real data is simply wrong, and the user cannot tell which is which.
- Decision: draw the line per screen. Today renders only live session state — the created goal, with actions derived from it by `deriveActions` — and shows a reachable empty state when there is none. Insights and Profile keep their fixtures and must carry `SAMPLE_DATA_NOTE` from `constants/copy.ts` verbatim. Onboarding answers are read back on Profile so the flow visibly affects the app. Error states are declared in the state union but not rendered while no failure can occur: the shape is agreed now so the backend milestone implements one pattern, without shipping a branch nothing can reach.
- Alternatives considered: wiring Insights and Profile to session state too — a just-created goal has no history, so both screens would be permanently empty and the design unreviewable; leaving Today mixed and documenting it — the defect this milestone existed to find; building a simulated failure toggle — dead UI in shipped code.
- Consequences: Today shows no streak, because a session-only goal cannot have one; streaks live on Insights until persistence exists. Any new screen must choose a side of this line and say which. Every fixture-backed screen carries the same sentence, so the fiction is labelled identically everywhere.
- Revisit when: persistence lands and real history exists, at which point the sample-data note and the derived actions are both replaced by server data.

### ADR-010: removing the Expo template demo surface

- Date: 2026-08-02
- Status: accepted
- Context: the SDK 54 template ships example screens and components. By M1d the app had replaced all of them, but the originals were still building and shipping, and ADR-004 had accepted them staying only "until those routes are replaced".
- Decision: delete them, having verified zero inbound references: `external-link`, `hello-wave`, `parallax-scroll-view` and `ui/collapsible` (no importers); the `modal` route and its registration (unreachable — nothing navigated to it); then the cascade those four exclusively kept alive, `themed-text`, `themed-view`, `use-theme-color` and `constants/theme`; plus 4 unused React logo images. `use-color-scheme`, `icon-symbol` and `haptic-tab` are kept — they feed `use-theme` and six MAX primitives.
- Alternatives considered: keeping them as reference — the template is a `git init` away and the code was actively misleading, since `constants/theme.ts` was a second colour system competing with the tokens.
- Consequences: ADR-004's note about two text components coexisting is now resolved — `components/ui/text.tsx` is the only one. `expo-web-browser` and `expo-image` are left with no importer; removing them needs a `package.json` change, so it is deferred to M1f rather than smuggled into this milestone.
- Revisit when: never for these files. The pattern — verify references, delete in dependency order, one commit — applies to future template removals.
