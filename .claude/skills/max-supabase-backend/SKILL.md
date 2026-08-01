---
name: max-supabase-backend
description: "Plan, implement, or review MAX backend work using Supabase: Auth, Postgres schema, migrations, RLS, Storage, Edge Functions, Realtime, generated types, quotas, and performance. Use for any backend or user-data task."
---

# MAX Supabase backend

1. Use official Supabase skills/docs and inspect current migrations/schema/types before proposing SQL.
2. Work through migrations; do not make undocumented dashboard-only schema changes.
3. Define ownership, authorization and lifecycle before tables or endpoints.
4. Enable RLS on user-accessible tables and write explicit policies. Client filters improve performance but are not authorization.
5. Validate inputs at trust boundaries; database constraints protect invariants.
6. Enforce quotas/rate limits atomically on the server. Frontend limits are UX only.
7. Keep service-role, database, email and AI secrets off the client and out of logs.
8. Index actual filter/join/order columns; select only needed fields and paginate collections.
9. Use private storage by default; validate owner path, MIME, size and deletion lifecycle.
10. Test with two users, logged-out access, expired sessions, duplicate requests and unauthorized access.
11. Generate and commit TypeScript database types after accepted migrations.
12. Use Supabase MCP only on a development project, project-scoped, minimum feature groups, read-only unless a reviewed migration is being applied, and with manual approval.
