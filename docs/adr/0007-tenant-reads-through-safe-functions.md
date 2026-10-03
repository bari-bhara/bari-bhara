# 0007 — Tenants read their data through column-safe functions

- **Status:** Accepted
- **Date:** 2026-10-03
- **Related:** [ADR 0003](0003-org-based-multi-tenancy-and-rls.md) (refines its tenant read model; does not supersede it)

## Context
Plan 0001 §3 gives tenants RLS `select` access to their own `tenants` row and `tenancies`, plus the `units` and `properties` of those tenancies. Those tables also hold landlord-only columns: `tenants.notes`, `tenancies.move_out_notes`, `units.notes` and `properties.notes`.

RLS filters **rows**, not columns. Column privileges apply per database role, and landlords and tenants share the `authenticated` role. A tenant with row access could therefore select the landlord's private notes about them.

## Decision
- Tenants get **no RLS policies** on tables that contain landlord-only columns.
- Tenant reads go through `security definer` functions in `public` that:
  - filter on `auth.uid()` internally;
  - return an explicit list of tenant-safe columns;
  - use `set search_path = ''`.
- The first one is `my_tenancies()`. Later phases add similar functions, or views over safe columns, for dashboards.
- Tables with no landlord-only columns (e.g. `charges` and `payments` in Phase 4, `notices` in Phase 6) may still give tenants direct RLS read access, as ADR 0003 describes.
- Any new landlord-only column must be checked against this rule.

## Alternatives considered
- **Revoke column `select` on notes from `authenticated`:** landlords would lose access too, since both use the same role.
- **Move private notes into separate landlord-only tables:** this works, but adds joins and tables for every entity just to hide one column.
- **Security-definer views:** Supabase advisors flag them, and they bypass RLS for every caller unless each one is filtered carefully.

## Consequences
- Every tenant-facing read needs a function, which is a bit more SQL. In return, the exposed columns are explicit and easy to review.
- Functions return flat rows, so there's no PostgREST embedding on the tenant side.
- Tenant isolation is checked in the function body, so each function must filter on `auth.uid()`. Review this whenever one is added.
