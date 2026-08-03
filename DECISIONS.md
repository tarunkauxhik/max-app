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
- Status: **superseded by ADR-015 and ADR-016 (2026-08-02, M5a)**
- Superseded because: this ADR set its own trigger — "revisit when the data and persistence milestone begins" — and M5a is that milestone. Goals, daily actions and check-ins are rows now, and none of them reset on reload. What survives of this decision is its reasoning, not its rule: state that genuinely has no home in the schema still belongs in memory, which is why `GoalDraftProvider` remains. ADR-014 had already carved out the onboarding flag ahead of this.
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
- Status: **partly superseded by ADR-015 (2026-08-02, M5a)**
- Superseded because: the root-mounted half is gone. `SessionGoalProvider` was removed in M5a.3 — its job was holding the confirmed goal above the session gate and clearing it on account change, and that guarantee moved to `goals_select_own`, where the database enforces it instead of a provider remembering to. `OnboardingProvider` survives with a narrower job, caching one flag for the route guard. **The flow-scoped half stands unchanged:** `GoalDraftProvider` and `OnboardingDraftProvider` still hold in-progress input in a `_layout.tsx`, still discard it on exit, and a half-finished form still has no business being a row.
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
- Status: **resolved by M5b (2026-08-04)**
- Resolved because: this ADR set its own trigger — "persistence lands and real history exists, at which point the sample-data note and the derived actions are both replaced by server data". Both halves are now moot. **No screen in MAX renders invented data**, `SAMPLE_DATA_NOTE` has no reader and `constants/copy.ts` is deleted along with both `mock-data.ts` files. What outlived it is the part that mattered: the `loading | ready | error` union it fixed while nothing could fail is the shape every server-backed hook now uses, and the rule that a screen must not mix real and invented data is what forced the Profile identity change in M4 and the fixture deletions here.
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

### ADR-015: client data access without a cache library

- Date: 2026-08-02
- Status: accepted
- Context: M5a turned four screens from session state into database reads and writes. Loading, error, retry and refetch behaviour had to come from somewhere, and DEPENDENCIES has listed TanStack Query as "pending data milestone" since M0. This was the milestone that could have taken it.
- Decision: hand-written hooks, one per surface — `useProfile`, `useActiveGoal`, `useToday` — each returning the `loading | ready | error` union ADR-009 fixed in M1e, with a `retry` the user can press. Data access lives in a plain `api.ts` per feature, so a screen never builds a query. TanStack Query is deferred to M6, which is already the caching milestone.
- Alternatives considered: **TanStack Query now** — it would have supplied caching, retry, focus refetching and mutation state for free, and avoided the rewrite M6 now implies. Rejected on debuggability: M5a's real job was proving the round trip and the schema, and with a cache in the same milestone a stale or missing row has three suspects — the query, the cache, or RLS — instead of one. There were three read surfaces, so hand-writing was not yet a burden. **A single shared `useQuery` helper** — the same reinvention with none of the library's testing behind it.
- Consequences: refetch-on-focus is written by hand in two hooks and is uncached, so opening Profile issues a request every time. That is correct behaviour and merely uncached — M6 deduplicates it rather than changing it. `useProfile` and the reconcile in `OnboardingProvider` both read the same row, one request each; the duplication is knowingly accepted and disappears with a cache. Every hook carries the same cancellation guard against a resolved request writing state for an account that has since signed out.
- Also decided here: **backend output is narrowed at the boundary.** The generated types describe CHECK-constrained columns as bare `string`, because a constraint is invisible to TypeScript. `parseInterests`, `parseCommitment`, `parseDifficulty` and `parseGoalStatus` validate rather than assert, per QUALITY_GATES. And **every update asks for the affected ids back**: an UPDATE that RLS filters out is not an error in PostgREST — it succeeds affecting zero rows — so checking only `error` would report silent data loss as success.
- Revisit when: M6. The trigger is explicit, and the shape above is deliberately the shape a `queryFn` slots into.

### ADR-016: local dates, and lazily generated daily actions

- Date: 2026-08-02
- Status: accepted
- Context: `goals.start_date`, `goal_actions.scheduled_date` and `check_ins.check_in_date` have no server default, by ADR-012's design, so M5a had to decide who computes the date. Separately, `goal_actions` are dated rows rather than a recurring template, so something has to create them.
- Decision, dates: the client sends its own local calendar date, computed in `lib/dates.ts` from `getFullYear`/`getMonth`/`getDate` — **not** from `toISOString().slice(0, 10)`, which converts to UTC first and reports the wrong day on either side of midnight for most of the world. `profiles.timezone` is stored separately, from `Intl`, and is what the server's `validate_check_in_date` trigger uses; it is left at its default rather than overwritten when `Intl` gives no usable answer, because a wrong IANA name is worse than a known default.
- Decision, actions: generated **lazily, per day, on the client**, when Today first opens for a date with no rows. The seed race is settled by `goal_actions_goal_date_position_key` — two concurrent loads both insert, the loser gets `23505`, and the recovery is to read what the winner wrote. Checking for existence first would not close that window; the constraint does.
- Alternatives considered: **generating the whole plan at goal creation** — a twelve-week goal would write ~252 rows up front, most for days that may never arrive, and M8 replanning would have to delete and rewrite them; **a database function** — atomic, but it puts plan logic in SQL where every tweak becomes a migration, the exact trap ADR-012 avoided by keeping the difficulty chips out of the schema, and M8's planner cannot easily reach it.
- Consequences: a goal that is never opened writes no action rows, which is why the goal archived before M5a.4 has none. The date is captured when a load runs, so an app left in the foreground across midnight keeps writing to the previous day until something triggers a reload — reacting to `AppState` and a clock tick belongs with M6. `validate_check_in_date` rejects a date after the owner's local today with `22023`, reachable only when `profiles.timezone` is still `'UTC'` while the device is ahead of it; that error is mapped to its own message rather than "check your connection", which would send the user to fix something that is not broken.
- Revisit when: M8 replaces `planActionsFor` with a real planner, or a feature needs actions for a future date — at which point lazy generation stops being sufficient on its own.

### ADR-017: how insights are derived

- Date: 2026-08-04
- Status: accepted
- Context: ADR-012 stored nothing derivable — no streak totals, no completion counts, no "week N of M" — on the grounds that a stored streak is a cache that goes stale the moment a check-in is backdated. M5b is where that bill came due: every number on Insights and the Profile achievement tiles had to be computed from rows.
- Decision: computed on the client, from four bounded queries, in pure functions that take `today` as an argument rather than reading the clock. `computeStreaks` and `currentWeekOf` live in their own modules — `features/insights/streaks.ts` and `progress.ts` — separate from `api.ts`, so neither is reachable only through a network call. `fetchAchievements` reuses `computeStreaks`, so "longest streak" on Profile and on Insights is one function, not two implementations that drift.
- Alternatives considered: **a Postgres view or RPC** — correct in principle and where this eventually belongs, but it makes every change to a definition a migration, and M5 deliberately added no new machinery (ADR-015); **storing the totals** — exactly what ADR-012 rejected, and backdating is a real case rather than a hypothetical one.
- Three semantics that are decisions rather than details:
  1. **A streak survives an unfinished today.** It counts back from the most recent check-in and stays alive while that is today *or* yesterday. The strict reading shows every user a zero each morning for a day that is not over, which is both discouraging and arguably false. A streak counts **distinct days**, so two goals checked in on one day is one day — and the Profile "check-ins" tile counts days for the same reason, rather than introducing a second definition of a check-in.
  2. **A day with no planned actions is not a failed day.** Actions are seeded lazily (ADR-016), so a day the app was never opened has none. The week summary therefore reads "3 of 5 planned days complete" rather than "3 of 7", which would silently count absence as failure.
  3. **Goal progress counts actions planned so far**, not a projection to the end of the goal. Projecting would assume three actions a day for the full duration — a client-side guess that M8's planner breaks on its first non-uniform plan.
- Consequences: the bounds are what make client-side aggregation defensible, and they are load-bearing rather than incidental — check-ins are one short row per goal per day, the weekly window is capped at 30 days, and per-goal actions are capped by a goal's own duration rather than by total account age. A user with years of history eventually outgrows this, and that is the trigger below. Every derived figure is recomputed on focus, uncached, which M6 addresses.
- Verified by execution, not review: both pure functions were run against the real source files over 27 cases — month ends, year ends, leap days, duplicate dates from two goals on one day, unsorted input, interior gaps, and goals run past their duration. LEARNINGS records why that mattered.
- Revisit when: M6 adds caching, a user accumulates more than roughly a year of check-ins, or a statistic is needed that cannot be computed from a bounded query — any of which makes a view or an RPC the right answer.
