# 0011 — Invite codes stay visible until used or expired

- **Status:** Accepted
- **Date:** 2026-10-24
- **Supersedes:** the "stored only as a sha256 hash" part of [ADR 0002](0002-tenant-onboarding-via-invite-code.md). The rest of ADR 0002 stands.

## Context
ADR 0002 stores only a hash of each invite code, so the landlord sees the code once and has to create a new one if it's lost. The team found this confusing ([Plan 0003](../plans/0003-feedback-round-1.md), C1) and asked for the code to stay visible on the tenant's page until it's used or expires.

## Decision
- We will also store each code **encrypted** (`pgp_sym_encrypt`, pgcrypto) with a key held in **Supabase Vault** (`vault.secrets`, name `invite_code_key`). The migration creates a random key if none exists.
- `code_hash` is still what `claim_tenant_invite()` matches on; nothing about claiming changes.
- `get_tenant_invite_code(tenant_id)` (security definer) returns the plaintext code and expiry only to a member of the tenant's organization, and only while the code is unused and unexpired.
- The tenant page shows the active code with Copy and its expiry; **Create new code** still replaces it.

## Alternatives considered
- **Keep show-once and improve the wording:** the safest option, but it doesn't meet the request.
- **Store the plaintext code:** simplest, but a database leak (backup, log, support query) would hand out working codes.

## Consequences
- A database dump alone no longer reveals codes; the Vault key is needed too. Someone with both, or with the landlord's session, can read unexpired codes. Codes are still single-use, expire in 7 days, and the claim lockout still applies.
- Codes created before this change have no encrypted copy; the page shows their expiry and offers a new code.
