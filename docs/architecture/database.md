# Database Reference

- **Status:** Living document. Update it in the same PR as any migration.
- **Source of truth:** `supabase/migrations/`. This page explains the schema; the migrations define it.
- **Design rationale:** [Plan 0001 §3](../plans/0001-initial-architecture-and-roadmap.md#3-database-design), [ADR 0003](../adr/0003-org-based-multi-tenancy-and-rls.md), [ADR 0004](../adr/0004-unified-charges-table-and-derived-overdue.md)

## Entity relationships
```
auth.users 1─1 profiles (role: landlord|tenant)
organizations 1─* organization_members *─1 profiles
organizations 1─* properties 1─* units 1─* tenancies *─1 tenants (─0..1 auth user)
tenants 1─* tenant_invites
tenancies 1─* charges *─1 charge_types ; charges 1─* payments
units/tenancies 1─* maintenance_requests 1─* maintenance_updates, maintenance_photos
organizations 1─* notices 1─* notice_units ; notices 1─* notice_reads
organizations 1─* notifications ; organizations 1─* activity_log
```

## Tables
Change "Planned" to "Implemented (migration file)" as each table lands, and expand its column list here.

| Table | Purpose | Phase | Status |
|---|---|---|---|
| `profiles` | One per auth user; `role` landlord/tenant | 1 | Planned |
| `organizations` | Data owner; currency, timezone | 1 | Planned |
| `organization_members` | User ↔ org, `owner`/`manager` | 1 | Planned |
| `properties` | Buildings; `rent_due_day` | 2 | Planned |
| `units` | Flats; status vacant/occupied/maintenance/inactive | 2 | Planned |
| `tenants` | Person renting; optional `user_id` link | 3 | Planned |
| `tenancies` | Tenant ↔ unit over time; move-in/out; never deleted | 3 | Planned |
| `tenant_invites` | Hashed one-time codes for linking a login | 3 | Planned |
| `activity_log` | Audit trail + dashboard activity, trigger-written | 3 | Planned |
| `charge_types` | Rent + utility types, extensible per org | 4 | Planned |
| `charges` | Rent and utility bills; trigger-maintained `amount_paid`/`status` | 4 | Planned |
| `payments` | Payments against a charge; voided, never deleted | 4 | Planned |
| `charge_balances` (view) | `outstanding`, `effective_status` incl. overdue | 4 | Planned |
| `maintenance_requests` | Tenant-reported issues | 5 | Planned |
| `maintenance_updates` | Comments, status history, internal notes | 5 | Planned |
| `maintenance_photos` | Storage paths for request photos | 5 | Planned |
| `notices` | Announcements with audience targeting | 6 | Planned |
| `notice_units` | Selected-unit targeting | 6 | Planned |
| `notice_reads` | Per-user read receipts | 6 | Planned |
| `notifications` | Per-channel reminder deliveries | 8 | Planned |

## Conventions
- PKs are `uuid default gen_random_uuid()`. Every table has `created_at timestamptz default now()`. Money is `numeric(12,2)`. Identifiers are lowercase snake_case.
- Every business table has `org_id`, with composite FKs to its parent's `(org_id, id)`.
- Every FK column is indexed.
- Enums are used for fixed state sets. Lookup tables are used where users can add values (e.g. `charge_types`).

## RLS summary
| Actor | Access |
|---|---|
| `anon` | Nothing |
| Landlord / manager | Full CRUD where `org_id in (select private.user_org_ids())` |
| Tenant | Read own tenant row, tenancies, their units/properties, charges, payments, non-internal maintenance updates, targeted notices, own notifications. Insert own maintenance requests, comments and notice reads |

Helpers in the `private` schema (not exposed through the API): `user_org_ids()`, `user_tenant_ids()`, `can_see_notice(notice_id)`, `custom_access_token_hook(event)`.

## Storage
| Bucket | Visibility | Path | Access |
|---|---|---|---|
| `maintenance-photos` | Private | `{org_id}/{request_id}/{uuid}.{ext}` | Org members; tenant who owns the request. Served via signed URLs |
