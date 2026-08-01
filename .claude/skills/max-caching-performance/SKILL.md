---
name: max-caching-performance
description: Design or review MAX data fetching, TanStack Query caching, Expo SQLite persistence, offline behavior, optimistic updates, low latency, list performance, render performance, and cache invalidation.
---

# MAX caching and performance

- Start from the user freshness requirement, not arbitrary cache times.
- Separate server state, local UI state, sensitive storage and offline drafts.
- Use TanStack Query only for server state. Use stable query keys and document ownership of invalidation.
- Persist only data that improves restart/offline UX; never persist secrets or uncontrolled large payloads.
- Prefer cached render plus background refresh. Do not show a blocking loader when valid cached data exists.
- Define offline behavior per mutation. Do not queue sensitive or non-idempotent operations without a designed conflict policy.
- Use optimistic updates only with rollback, duplicate prevention and server reconciliation.
- Paginate long histories/feeds and measure before adding specialized list libraries.
- Profile before optimizing; record device, build mode and evidence.
- Test cold start, warm start, slow network, offline, reconnect, duplicate taps, stale data, logout cache clearing and account switching.
- Document query keys, stale/retention policy and invalidation in code or architecture notes.
