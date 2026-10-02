# 0003 — Organization-based multi-tenancy enforced by RLS

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
Each landlord must only ever see their own data. The roadmap also includes property managers and multiple people managing the same portfolio.

## Decision
- Data belongs to an **organization**, not directly to a user. Signing up as a landlord automatically creates an organization and an `owner` membership (`organization_members`, role `owner|manager`).
- **Every business table carries `org_id`.** Composite foreign keys such as `(org_id, property_id) → properties(org_id, id)` make cross-org references impossible.
- RLS is enabled on every table:
  - Landlord/manager policies: `org_id in (select private.user_org_ids())`.
  - Tenant policies go through `private.user_tenant_ids()` and are mostly read-only.
- Helper functions live in an unexposed `private` schema as `security definer stable` with `set search_path = ''`. Policies call them as `(select private.fn())` so each is evaluated once per query.
- A Custom Access Token Hook adds a `user_role` claim to the JWT. It is used **only** for redirects in `proxy.ts`. RLS never trusts `user_metadata`.
- `anon` has no table privileges. `profiles.role` cannot be updated by users.

## Alternatives considered
- **`owner_id` on properties only, with RLS joining up the hierarchy:** simpler at first, but policies become slow multi-join checks, and adding managers later means restructuring the schema.
- **Schema-per-landlord:** too much operational overhead.

## Consequences
- `org_id` is slightly denormalized, but policies stay cheap and uniform.
- Adding property managers later only means adding membership rows.
- Isolation must be verified manually and with Playwright cross-account checks while automated DB tests are deferred.
