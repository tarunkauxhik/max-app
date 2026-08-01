---
name: max-external-setup
description: Guide the user through external setup for Expo, EAS, Supabase, SMTP/domain DNS, Groq or another AI provider, GitHub, Android signing, Apple/TestFlight, analytics, monitoring, or app distribution.
---

# MAX external setup

- Verify current official instructions and free-tier/credential requirements before guiding.
- Explain why the external action is needed now; defer it when a later milestone can handle it.
- Give one checkpoint at a time with exact current dashboard navigation and values.
- Label every value as public, sensitive or secret.
- Never ask the user to paste passwords, access tokens, API keys, database passwords, signing keys, recovery codes or OTPs.
- State expected visible result and a verification step.
- Ask the user to return only non-secret identifiers/status or a redacted screenshot.
- Record service, region, non-secret project identifier and verification date in `EXTERNAL_SETUP_TRACKER.md`.
- Stop on UI mismatch or uncertainty and re-check official docs; do not invent menu names.
