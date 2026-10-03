# 0002 — Tenant onboarding via invite code

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
Landlords create tenant records, and many tenants may never use the app. Tenants who do want a login must be linked to their existing tenant record without being able to claim someone else's.

## Decision
- A tenant record exists independently of any login (`tenants.user_id` is nullable).
- The landlord generates an **invite code** for a tenant. It is 10 characters of base32 (~50 bits), stored only as a sha256 hash, expires after 7 days, and can be used once.
- The tenant signs up with role `tenant`, confirms their email, logs in, and enters the code at `/tenant/join`.
- The `claim_tenant_invite(code)` RPC is security definer. It verifies that the caller is a tenant, the code is valid, unexpired and unused, and the tenant record is unlinked. It then sets `tenants.user_id = auth.uid()` and marks the code as used.
- Failed attempts are counted per user, with a lockout after 10.

## Alternatives considered
- **Landlord sends a Supabase invite email:** a smoother experience, but it needs the service-role key on the server and a reliable email setup from day one.
- **Match on email automatically:** unsafe, because tenant emails are optional and unverified when the landlord enters them.

## Consequences
- The landlord has to share the code (verbally, by SMS or WhatsApp), which adds one manual step.
- No service-role key is needed.
- Public signup lets anyone create a `tenant` account, but such an account sees nothing until it claims a valid code.
