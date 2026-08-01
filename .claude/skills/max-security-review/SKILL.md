---
name: max-security-review
description: Threat-model or review MAX code and configuration involving authentication, authorization, secrets, personal data, uploads, AI, external APIs, permissions, logging, rate limits, account deletion, or dependencies.
---

# MAX security review

- Identify assets, actors, trust boundaries, abuse cases and data retention before implementation.
- Treat the mobile client as untrusted. Enforce authorization, quotas and invariants server-side.
- Never request or expose secret keys. Public client identifiers must still be protected by RLS and server controls.
- Validate input and output at every external boundary. Fail closed on authorization and quota checks.
- Use least privilege, private-by-default storage and minimal collected data.
- Prevent enumeration, replay, duplicate submissions, unrestricted retries and user-controlled storage paths.
- Redact tokens, OTPs, email content, journal text and private messages from logs/analytics.
- AI calls require authenticated server proxy, size limits, timeout, structured output validation, usage limits and safe fallback.
- Account deletion must cover database rows, storage objects, sessions and external processor data where applicable.
- Report findings by severity with exploit path, affected file, evidence and concrete fix. Do not claim security solely from code inspection when runtime/RLS tests are required.
