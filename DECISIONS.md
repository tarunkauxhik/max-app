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

### ADR-011: Supabase development project and credential handling

- Date: 2026-08-02
- Status: accepted
- Context: M2 needs a hosted Postgres before schema or RLS work can begin. ADR-002 named Supabase as the preferred backend "subject to re-verification when backend work starts" — this is that point.
- Decision: create one Free-plan project, `max-dev`, in South Asia (Mumbai) `ap-south-1`, for development only. Credentials are handled by class, not by convenience: the database password and any `sb_secret_` key are secrets that never enter the repository, the client bundle, logs or chat, and live only in a password manager. The `sb_publishable_` key is safe to expose by design but is still read from a gitignored `.env` rather than committed, so rotation and per-environment values stay possible. Any credential that reaches chat or a commit is treated as disclosed and rotated, regardless of whether misuse is suspected.
- Alternatives considered: a paid plan now — nothing in M2 exceeds Free limits, and the 7-day inactivity pause is an acceptable development annoyance; committing the publishable key directly since it is public — safe, but it pins one environment into git and makes rotation a code change; deferring the project until M2c — schema work cannot be tested without somewhere to apply it.
- Consequences: the Free plan pauses after 7 days of inactivity and has no backups, so `max-dev` is disposable and committed migrations are the real source of truth. A production project is a separate decision with its own credentials and region. `.env` had to be added to `.gitignore`, which previously ignored only `.env*.local` — meaning a `.env` created before this change would have been committed.
- Revisit when: production is provisioned, the Free plan is exceeded, or Supabase changes its key model again.

### ADR-012: MAX core schema, ownership model and privilege boundary

- Date: 2026-08-02
- Status: accepted
- Context: M2c had to turn the static flows into the smallest schema that supports them. The data needs were known from real screens rather than guessed, because M1e had already audited every one.
- Decision: four tables — `profiles`, `goals`, `goal_actions`, `check_ins` — with six design commitments. (1) Actions are dated rows, not a recurring template: a template forces every day to look identical, which AI planning breaks immediately. (2) `user_id` is denormalised onto child tables so RLS never sub-queries a parent, and drift is made impossible rather than merely unlikely by pointing the foreign key at `goals (id, user_id)`. (3) Nothing derivable is stored — streaks, week N of M, completion counts and achievement totals are all computed, because a stored streak is a cache that goes stale the moment a check-in is backdated. (4) Rules that depend on anything outside the row are triggers, not CHECK constraints: a CHECK is assumed to hold for the life of the row and is never re-evaluated, so a catalog lookup or a comparison against today does not belong in one. (5) Goals archive rather than delete, and one lifecycle invariant covers all three states, permitting an archived goal to retain `completed_at`. (6) Clients receive column-level grants, not table-level: RLS answers "which rows", never "which columns", so without them an UPDATE satisfying `user_id = auth.uid()` could still rewrite `created_at` or re-parent an action.
- Alternatives considered: a recurring action template (simpler, but wrong the first time a plan varies by day); RLS policies that join to the parent for ownership (correct but slower, and the composite FK gives the same guarantee for free); storing streak totals (fast to read, wrong after any backdated write); table-level grants (one line each, but leaves every server-owned column writable by its owner); `bigint identity` primary keys (the general default, but these IDs ship to a mobile client where sequential values leak volume and invite enumeration).
- Consequences: `goals` carries a redundant `unique (id, user_id)` purely as the composite-FK target, which is the deliberate cost of the ownership guarantee. Column grants must be revised whenever a column is added, and a forgotten grant surfaces as a client write failing rather than as a silent hole. `start_date` and `check_in_date` have no server default, because the server's date is not the user's; callers must supply the local date, and `profiles.timezone` is what makes that checkable.
- Revisit when: the AI planning milestone changes how actions are generated, a second client needs different column access, or aggregate queries over `interests` justify normalising it out of an array.

### ADR-013: device session storage

- Date: 2026-08-02
- Status: accepted
- Context: M4 gave the app real accounts, and a session that does not survive a force-quit is not a session — the user signs in again on every launch. Supabase's `persistSession` needs a storage adapter, and React Native ships no persistent key–value store, so this was the one genuinely unavoidable dependency decision in the milestone.
- Decision: `expo-sqlite`, imported as `expo-sqlite/kv-store` and passed to `createClient` as `auth.storage`. The same store also holds the per-account onboarding record. The refresh token is stored **unencrypted at rest** in app-private storage, and that is accepted for `max-dev`.
- Alternatives considered: **`expo-secure-store` alone** — hardware-backed, but its own SDK 54 documentation warns that "large payloads can be rejected by the underlying platform. Historically, some iOS releases refused values above roughly 2048 bytes. Expo does not enforce a limit, so make sure to handle native errors if you plan to store very large strings" (verified 2026-08-02). A Supabase session carries a JWT, a refresh token and a user object, which lands in that range, and the failure is a native error at write time rather than something detectable in advance. That is an unreliable place for the one value the app cannot afford to lose, and the iPhone review is still outstanding; **a SecureStore + AES hybrid**, encrypting the session with a key held in SecureStore — genuinely more secure, but it adds a crypto dependency, a key-rotation path and a failure mode where an unreadable key silently signs everyone out, which is a lot of machinery to protect a development project with one user; **AsyncStorage** — a third-party package that does the same job as a first-party Expo module already being installed.
- Deviation from the approved plan, recorded rather than silently taken: the plan specified `expo-sqlite/localStorage/install`, which is what Expo's own Supabase guide shows. The code imports `expo-sqlite/kv-store` instead. Same package, same SQLite store, different entry point. Only `./kv-store` declares a `types` condition in the export map; `./localStorage/install` declares only `default`, so the shim route typechecks off the DOM `Storage` interface that `expo/tsconfig.base` supplies via `lib: ["DOM", "ESNext"]` — a browser type definition standing in for a React Native module. It also patches a global named `localStorage`, which reads as a mistake in a React Native file. Both were confirmed to compile under `strict` before choosing, so this was decided on evidence rather than taste.
- Consequences: on a non-rooted device the OS sandbox is the only thing protecting the token, and on a rooted or physically compromised device holding the file is equivalent to being signed in until the token is revoked. `expo-sqlite`'s `useSQLCipher` would encrypt the store, but it is a config-plugin flag that only takes effect in a native build — verified against `plugin/build/withSQLite.d.ts` — so it is unreachable while the project runs in Expo Go. Auto-refresh is bound to `AppState`, so a backgrounded app is not renewing credentials. Installing `expo-sqlite` here also satisfies M6's offline cache, which DEPENDENCIES had listed as a separate pending package.
- Revisit when: **before M11**, when an APK is distributed to anyone other than the developer. That is the point where a real user's token sits on a device we do not control, and it coincides with the development build that makes `useSQLCipher` available. Also revisit if Expo gives `localStorage/install` real type declarations, which would remove the only substantive reason to differ from the documented guide.

### ADR-014: authentication gating, and what it supersedes

- Date: 2026-08-02
- Status: accepted
- Context: ADR-008 gated the tab tree on an in-memory onboarding flag and set its own revisit trigger — "real auth is added and the guard must read a session rather than a memory flag". M4 is that point. The question was not whether to keep `Stack.Protected` but what the gate order should be and which state now has to outlive a restart.
- Decision: three gates in sequence in `app/_layout.tsx` — `signed-out → (auth)`, `signed-in && !completed → onboarding`, `signed-in && completed → (tabs)` and `goal`. Each stage is unmounted rather than hidden, which is what makes hardware back exit instead of revealing the stage behind it. A fourth state, `loading`, renders nothing and holds the native splash, because reading the stored session is fast but not instant and the alternative is a frame of the sign-in screen on every cold start of a signed-in app. Onboarding completion moves to device storage, **keyed per user id**.
- Narrow supersession: ADR-005 and ADR-007 said all interface state is memory-only during static milestones. That still holds for everything except the onboarding flag. Once the session itself survives a restart, an onboarding flow that replays on every launch stops reading as "static milestone" and starts reading as a bug. M5 moves the flag to the `profiles` row, at which point the device copy becomes a cache rather than the source of truth.
- Defect found in review, before any device test: `SessionGoalProvider` is mounted **above** the gate, so unlike the tab tree it is not unmounted by signing out. Left alone, one account's goal would have carried into the next account on a shared device, and would also have survived a session that ended without anyone pressing anything — an expired refresh token, for instance. Clearing on account change is therefore that provider's own responsibility, not the sign-out button's. Both it and `OnboardingProvider` adjust state **during render** when the user id changes, rather than in an effect: an effect would render one frame containing the previous account's data before clearing it.
- Amends ADR-009: that decision drew the live-versus-sample line per screen and put Profile on the sample side. Profile now mixes all three — a real signed-in email, the real onboarding answers, and achievements still labelled with `SAMPLE_DATA_NOTE`. The fixture name, initials and bio were removed, because once a real account exists an invented identity beside it is exactly the misleading kind of placeholder ADR-009 was written to forbid. `display_name` exists on the `profiles` row but nothing reads it until M5, so the email stands in and the caption says so rather than implying a name is missing.
- Alternatives considered: a single combined guard — it collapses "not signed in" and "not onboarded" into one branch, and the two need different screens; redirecting inside the tab layout — the tab tree still mounts first, the same reason ADR-008 rejected it; clearing session-scoped state inside the sign-out handler — it only covers sign-outs the user initiates, and misses expiry entirely.
- Consequences: signing out unmounts the whole authenticated tree, so no path leaves a stale screen holding another account's data. Onboarding answers persist on the device after sign-out by design, so re-signing-in does not replay the flow; SECURITY.md records the retention that implies. Any state added above the gate inherits the same obligation to clear on account change, which is a trap for future providers.
- Revisit when: M5 moves onboarding completion to `profiles`, or a fourth gate is needed (a paywall or an email-confirmation hold), at which point the sequence deserves a named state machine rather than three booleans.
