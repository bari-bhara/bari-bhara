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
| `profiles` | One per auth user; `role` landlord/tenant | 1 | Implemented (`20261002211833_foundation`) |
| `organizations` | Data owner; currency, timezone | 1 | Implemented (`20261002211833_foundation`) |
| `organization_members` | User ↔ org, `owner`/`manager` | 1 | Implemented (`20261002211833_foundation`) |
| `properties` | Buildings; `rent_due_day` | 2 | Implemented (`20261002233120_properties_and_units`) |
| `units` | Flats; status vacant/occupied/maintenance/inactive | 2 | Implemented (`20261002233120_properties_and_units`) |
| `property_overview` (view) | Properties + unit/occupied/vacant counts | 2 | Implemented (`20261002233120_properties_and_units`) |
| `tenants` | Person renting; optional `user_id` link | 3 | Implemented (`20261003005507_tenants_and_tenancies`) |
| `tenancies` | Tenant ↔ unit over time; move-in/out; never deleted | 3 | Implemented (`20261003005507_tenants_and_tenancies`) |
| `tenant_invites` | Hashed one-time codes for linking a login | 3 | Implemented (`20261003005507_tenants_and_tenancies`) |
| `activity_log` | Audit trail + dashboard activity, trigger-written | 3 | Implemented (`20261003005507_tenants_and_tenancies`) |
| `tenant_overview` (view) | Tenants + current/latest tenancy, unit, property | 3 | Implemented (`20261003005507_tenants_and_tenancies`) |
| `charge_types` | Rent + utility types, extensible per org | 4 | Implemented (`20261003020150_charges_and_payments`) |
| `charges` | Rent and utility bills; trigger-maintained `amount_paid`/`status` | 4 | Implemented (`20261003020150_charges_and_payments`) |
| `payments` | Payments against a charge; voided, never deleted | 4 | Implemented (`20261003020150_charges_and_payments`) |
| `charge_overview`, `payment_overview` (views) | Landlord lists with tenant/unit/property names | 4 | Implemented (`20261003020150_charges_and_payments`) |
| `charge_balances` (view) | `outstanding`, `effective_status` incl. overdue | 4 | Implemented (`20261003020150_charges_and_payments`) |
| `maintenance_requests` | Tenant-reported issues | 5 | Implemented (`20261003090154_maintenance`) |
| `maintenance_updates` | Comments, status history, internal notes | 5 | Implemented (`20261003090154_maintenance`) |
| `maintenance_overview` (view) | Requests + names + photo/comment counts | 5 | Implemented (`20261003090154_maintenance`) |
| `maintenance_photos` | Storage paths for request photos | 5 | Implemented (`20261003090154_maintenance`) |
| `notices` | Announcements with audience targeting | 6 | Implemented (`20261003100000_notices`) |
| `notice_units` | Selected-unit targeting | 6 | Implemented (`20261003100000_notices`) |
| `my_notices`, `notice_overview` (views) | Tenant inbox with read state; landlord list with targeting and read counts | 6 | Implemented (`20261003100000_notices`) |
| `notice_reads` | Per-user read receipts | 6 | Implemented (`20261003100000_notices`) |
| `notifications` | Per-channel reminder deliveries | 8 | Implemented (`20261003120000_notifications`) |

## Implemented tables

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | → `auth.users.id`, on delete cascade |
| `role` | `user_role` enum (`landlord`, `tenant`) | Set at signup; users have no UPDATE privilege on it |
| `full_name` | text, ≤120 | User-editable |
| `phone` | text, ≤30, nullable | User-editable |
| `created_at`, `updated_at` | timestamptz | `updated_at` maintained by trigger |

RLS: a user can select and update only their own row. `supabase_auth_admin` can select (for the token hook).

### `organizations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text, 1–120 | Owner-editable |
| `currency` | text, ISO 4217 (`^[A-Z]{3}$`) | Default `BDT` |
| `timezone` | text | Default `Asia/Dhaka`; used for due-date and overdue calculations |
| `created_at`, `updated_at` | timestamptz | |

RLS: members can select; owners can update `name`, `currency` and `timezone`. There are no insert/delete grants (created by the signup trigger).

### `organization_members`
| Column | Type | Notes |
|---|---|---|
| `org_id` | uuid → organizations | PK part; cascade |
| `user_id` | uuid → profiles | PK part; cascade; indexed |
| `role` | `org_member_role` enum (`owner`, `manager`) | |
| `created_at` | timestamptz | |

RLS: members can see the memberships of their organizations. There are no write grants yet; adding managers comes later.

### `properties`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid → organizations | cascade; not updatable |
| `name` | text, 1–120 | |
| `address` | text, ≤300 | default `''` |
| `city` | text, ≤80 | default `''` |
| `rent_due_day` | smallint, 1–28 | default 5. Day of month rent falls due |
| `notes` | text, ≤1000 | landlord-only |
| `archived_at` | timestamptz, nullable | set = archived (hidden from lists, kept for history) |
| `created_at`, `updated_at` | timestamptz | `updated_at` maintained by trigger |

Constraints: `unique (org_id, id)` is the target for child composite FKs and doubles as the `org_id` index.

RLS: org members can select, insert, update and delete (`org_id in (select private.user_org_ids())`). Insertable columns: `org_id, name, address, city, rent_due_day, notes`; updatable: the same minus `org_id`, plus `archived_at`. Tenants have no direct access; they see their property through `my_tenancies()` ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)). Archiving a property with active tenancies is refused by the app.

### `units`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid | composite FK with `property_id`; not updatable |
| `property_id` | uuid | `(org_id, property_id) → properties (org_id, id)` **on delete restrict**; not updatable |
| `unit_number` | text, 1–20 | `unique (property_id, unit_number)` |
| `floor` | text, ≤20 | text so `G`/`Ground` work |
| `unit_type` | text, ≤40 | free text, e.g. "2 bed flat", "Shop" |
| `bedrooms` | smallint 0–20, nullable | |
| `default_rent` | numeric(12,2) ≥ 0 | suggested rent for new tenancies |
| `status` | `unit_status` enum (`vacant`, `occupied`, `maintenance`, `inactive`) | default `vacant`. Invariant enforced by trigger: `occupied` ⇔ the unit has an active tenancy. Moving in sets it, moving out sets `vacant`; any other write to or from `occupied` fails with `BB003` |
| `notes` | text, ≤1000 | landlord-only |
| `created_at`, `updated_at` | timestamptz | `updated_at` maintained by trigger |

Constraints and indexes: `unique (org_id, id)` (for Phase 3+ composite FKs), `unique (property_id, unit_number)`, `units (org_id, property_id)` (FK index), `units (property_id, status)` (status filters).

RLS: org members can select, insert, update and delete. Insertable columns: everything except `id` and timestamps; updatable: the same minus `org_id` and `property_id`, so a unit never moves between properties or orgs. A property with units can't be deleted (FK restrict); it is archived instead.

### `property_overview` (view)
`security_invoker = true`, so the caller's RLS on `properties` and `units` applies. Columns: the property's `id, org_id, name, address, city, rent_due_day, archived_at, created_at`, plus `unit_count`, `occupied_count`, `vacant_count` (ints). Used by the property list so it is a single query. `select` granted to `authenticated`.

### `tenants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid → organizations | cascade; not updatable |
| `full_name` | text, 1–120 | |
| `phone` | text, ≤30 | default `''` |
| `email` | text, ≤254 | default `''`; unverified, never used for authorization |
| `notes` | text, ≤1000 | **landlord-only** |
| `user_id` | uuid → auth.users, nullable | set only by `claim_tenant_invite()`; not writable through the API |
| `created_at`, `updated_at` | timestamptz | |

Constraints and indexes: `unique (org_id, id)`, `unique (org_id, user_id)`, `tenants (user_id)`, `tenants (org_id, full_name)`.

RLS: org members can select, insert and update. There is no delete; tenant records are history. Insertable: `org_id, full_name, phone, email, notes`; updatable: the same minus `org_id`.

### `tenancies`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id`, `tenant_id`, `unit_id` | uuid | composite FKs `(org_id, tenant_id) → tenants`, `(org_id, unit_id) → units`, **on delete restrict**; not updatable |
| `monthly_rent`, `security_deposit` | numeric(12,2) ≥ 0 | |
| `move_in_date` | date | |
| `move_out_date` | date, nullable | `>= move_in_date` |
| `move_out_reason` | text, ≤120 | |
| `move_out_notes` | text, ≤1000 | **landlord-only** |
| `status` | `tenancy_status` enum (`active`, `moved_out`) | check: `moved_out` ⇔ `move_out_date is not null` |
| `created_by` | uuid → auth.users | default `auth.uid()` |
| `created_at`, `updated_at` | timestamptz | |

Indexes: partial unique `tenancies (unit_id) where status = 'active'` (one current tenancy per unit), `(tenant_id, org_id)`, `(unit_id, org_id)`, `(created_by)`.

Triggers:
- `tenancies_guard` (before insert/update): new active tenancies need a unit that isn't `inactive` in a non-archived property (`BB001`). A moved-out tenancy's status, dates and amounts are frozen (`BB002`).
- `tenancies_sync_unit_occupancy` (after insert/update of status): sets the unit `occupied` / `vacant`.
- `tenancies_log_activity`: `TENANT_MOVED_IN`, `TENANT_MOVED_OUT`.

RLS: org members can select, insert and update. There is no delete; moving out is an update. Insertable: `org_id, tenant_id, unit_id, monthly_rent, security_deposit, move_in_date` (status starts `active`); updatable: `monthly_rent, security_deposit, status, move_out_date, move_out_reason, move_out_notes`.

### `tenant_invites`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id`, `tenant_id` | uuid | composite FK to tenants, cascade |
| `code_hash` | text, unique | sha256 hex of the normalized code. **Not selectable** by `authenticated` |
| `expires_at` | timestamptz | default now() + 7 days |
| `used_at`, `used_by` | timestamptz, uuid | set on a successful claim |
| `created_by`, `created_at` | | |

RLS: org members can select (every column except `code_hash`). There are no write grants; rows are written only by the invite RPCs.

`private.invite_claim_failures` (`user_id` PK, `failed_count`, `last_failed_at`) is not exposed. After 10 failed claims, claiming is locked for 24 hours from the last failure; a success clears the row.

### `activity_log`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid → organizations | cascade |
| `actor_id` | uuid → auth.users, nullable | `auth.uid()` at write time (null for seed/system writes) |
| `event_type` | text, `^[A-Z][A-Z_]*$` | `TENANT_CREATED`, `TENANT_MOVED_IN`, `TENANT_MOVED_OUT`, `TENANT_INVITE_CREATED`, `TENANT_LINKED`, `RENT_GENERATED`, `BILL_CREATED`, `CHARGE_VOIDED`, `PAYMENT_RECORDED`, `PAYMENT_VOIDED`, `MAINTENANCE_CREATED`, `MAINTENANCE_STATUS_CHANGED`, `NOTICE_CREATED`, `REMINDER_SENT` |
| `entity_type`, `entity_id` | text, uuid | e.g. `tenant`, `tenancy` |
| `metadata` | jsonb | event details |
| `created_at` | timestamptz | |

Indexes: `(org_id, created_at desc)`, `(entity_id)`, `(actor_id)`. RLS: org members can select. Written only by `private.log_activity()` from security-definer triggers and RPCs.

### `tenant_overview` (view)
`security_invoker = true`. Each tenant (`id, org_id, full_name, phone, email, has_login, created_at`) with their current tenancy, or latest one if they've moved out (`tenancy_id, tenancy_status, monthly_rent, move_in_date, move_out_date, unit_id, unit_number, property_id, property_name`). Backs the tenant list (search, filters, sort, pagination).

### RPCs
| Function | Security | Purpose |
|---|---|---|
| `add_tenant(p_unit_id, p_full_name, p_phone, p_email, p_notes, p_monthly_rent, p_security_deposit, p_move_in_date) → uuid` | invoker | Creates a tenant and their first tenancy atomically, under the caller's RLS |
| `create_tenant_invite(p_tenant_id) → (invite_code, invite_expires_at)` | definer; checks org membership | Issues a 10-character Crockford base32 code (50 bits, from `gen_random_bytes`), replacing any unused one. Stores only the hash and returns the plaintext once. `BB004` not found, `BB005` already linked |
| `claim_tenant_invite(p_code) → text` | definer | Normalizes the code (case, spaces, dashes, `O→0`, `I/L→1`), checks the lockout, and links `tenants.user_id = auth.uid()`. Returns `linked`, `invalid`, `locked`, `not_tenant` or `already_linked`, so the failure count isn't rolled back |
| `my_tenancies() → table` | definer, stable | The caller's tenancies with **tenant-safe columns only**: tenancy dates and amounts, unit number/floor/type/bedrooms, property name/address/city/rent due day, organization name/currency/timezone. No notes ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)) |

Custom SQLSTATEs: `BB001` unit unavailable, `BB002` tenancy frozen, `BB003` occupancy mismatch, `BB004` not found, `BB005` already linked. The app maps them in [`lib/postgres-errors.ts`](../../lib/postgres-errors.ts).

### `charge_types`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid → organizations, nullable | null = system default |
| `key` | text, `^[a-z][a-z0-9_]{0,39}$` | `unique nulls not distinct (org_id, key)` |
| `label` | text, 1–60 | |
| `category` | `charge_category` enum (`rent`, `utility`) | check: only the system `rent` type is `rent`; custom types are utilities |

Seeded by the migration: `rent`, `electricity`, `gas`, `water`, `internet`, `other`. RLS: everyone signed in can read system types; org types are visible to members and that org's tenants. There are no write grants yet (custom types get a UI later).

### `charges`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `unique (org_id, id)` for payments' composite FK |
| `org_id`, `tenancy_id` | uuid | composite FK → tenancies, restrict |
| `unit_id` | uuid | **filled by trigger** from the tenancy; composite FK → units |
| `charge_type_id` | uuid → charge_types | restrict |
| `category` | `charge_category` | **copied by trigger** from the type |
| `billing_month` | date | must be the 1st of a month |
| `amount` | numeric(12,2) > 0 | fixed once created (void and re-create to correct) |
| `due_date` | date | |
| `amount_paid` | numeric(12,2) | sum of live payments, **trigger-maintained**; `0 ≤ amount_paid ≤ amount` |
| `status` | `charge_status` enum (`unpaid`, `partially_paid`, `paid`, `void`) | **derived by trigger** from `amount_paid`; users can only set `void` |
| `description` | text, ≤200 | tenant-visible |
| `voided_at`, `void_reason` | | `status = 'void'` ⇔ `voided_at is not null` |
| `created_by`, `created_at`, `updated_at` | | |

Indexes: partial unique `(tenancy_id, billing_month) where category = 'rent' and status <> 'void'` (idempotent rent; a voided rent charge can be regenerated), `(tenancy_id, org_id)`, `(unit_id, org_id)`, `(charge_type_id)`, `(created_by)`, `(org_id, billing_month)`, partial `(org_id, due_date) where status in ('unpaid','partially_paid')`.

Triggers: `charges_prepare` (before insert/update): derived columns, status derivation, void rules. A charge with live payments can't be voided (`BB007`); a void charge is frozen (`BB006`). `charges_log_activity`: `BILL_CREATED` (utilities), `CHARGE_VOIDED`.

RLS: members can select, insert and update; the charged tenant can select their own **non-void** charges directly (no landlord-only columns; [ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)). There is no delete. Insertable: `org_id, tenancy_id, charge_type_id, billing_month, amount, due_date, description`; updatable: `status, void_reason`.

### `payments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id`, `charge_id` | uuid | composite FK → charges, restrict |
| `amount` | numeric(12,2) > 0 | |
| `paid_on` | date | the app rejects future dates |
| `method` | `payment_method` enum (`cash`, `bank_transfer`, `bkash`, `nagad`, `card`, `other`) | |
| `reference` | text, ≤100 | transaction ID etc. |
| `recorded_by`, `created_at` | | |
| `voided_at`, `void_reason` | | set once; never undone |

Indexes: `(charge_id, org_id)`, `(recorded_by)`, `(org_id, paid_on desc)`.

Triggers:
- `payments_guard` (before): no payments on void charges (`BB006`); a void payment is frozen (`BB009`).
- `payments_apply` (after insert / update of `voided_at`): locks the charge, recomputes `amount_paid` from live payments, **rejects overpayment** (`BB008`), and logs `PAYMENT_RECORDED` / `PAYMENT_VOIDED`.

RLS: members can select, insert and update (void). The paying tenant can select their own non-void payments. There is no delete. Insertable: `org_id, charge_id, amount, paid_on, method, reference`; updatable: `voided_at, void_reason`.

### `charge_balances` (view)
`security_invoker = true`. Every `charges` column plus `type_key`, `type_label`, `outstanding` (0 for void, else `amount - amount_paid`) and `effective_status`: `overdue` when unpaid or partly paid and `due_date < private.org_today(org_id)`, otherwise the stored status. **All balance reads use this view** ([ADR 0004](../adr/0004-unified-charges-table-and-derived-overdue.md)). Tenants read it too.

### `charge_overview`, `payment_overview` (views)
`security_invoker = true`, for landlord lists. `charge_overview` = `charge_balances` + `tenant_id, tenant_name, unit_number, property_id, property_name`. `payment_overview` = payment columns + the charge's `category`, `billing_month`, `type_label` + tenant, unit and property names. Tenants get no rows (they can't read tenancies/tenants).

### `generate_monthly_rent(p_month date, p_property_id uuid default null) → int`
Security invoker. Creates one rent charge per active tenancy with `monthly_rent > 0` that moved in by the month's end, in one property or all of the caller's non-archived properties. Amount = the tenancy's rent; due date = the property's `rent_due_day` in that month; description "Rent for <Month YYYY>". `on conflict do nothing` on the rent index, so it's idempotent. Returns the number created and logs one `RENT_GENERATED` per organization (via `private.log_rent_generated`, which checks membership).

Custom SQLSTATEs added: `BB006` charge void, `BB007` charge has live payments, `BB008` overpayment, `BB009` payment already void.

### `maintenance_requests`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `unique (org_id, id)` |
| `org_id`, `unit_id` | uuid | composite FK → units, restrict |
| `tenancy_id`, `tenant_id` | uuid, nullable | composite FKs. Set from the tenancy (tenant RPC) or from the unit's current tenancy (landlord-raised); null for an empty unit |
| `created_by` | uuid → auth.users | the session user (trigger) |
| `category` | `maintenance_category` enum | plumbing, electrical, air_conditioning, water, door_lock, internet, appliance, other |
| `title` | text, 3–120 | |
| `description` | text, ≤2000 | |
| `status` | `maintenance_status` enum (`pending`, `in_progress`, `resolved`, `cancelled`) | always `pending` on insert |
| `assigned_to` | text, ≤120 | free text (vendor); tenant-visible |
| `resolved_at` | timestamptz | trigger-maintained; `status = 'resolved'` ⇔ set |
| `created_at`, `updated_at` | | |

Indexes: `(org_id, status, created_at desc)`, `(unit_id, org_id)`, `(tenancy_id, org_id)`, `(tenant_id, org_id)`, `(created_by)`.

There are no landlord-only columns, so the reporting tenant reads their own rows directly ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)). RLS: members can select, insert and update; tenants can select their own (`tenant_id in user_tenant_ids()`). Tenants create and cancel only through RPCs. Insertable: `org_id, unit_id, category, title, description`; updatable: `status, assigned_to`. There is no delete.

Triggers: `maintenance_requests_prepare` (links the tenancy/tenant, forces `pending`, maintains `resolved_at`). `maintenance_requests_log` writes a `maintenance_updates` status row on every status change, plus `MAINTENANCE_CREATED` / `MAINTENANCE_STATUS_CHANGED` activity.

### `maintenance_updates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id`, `request_id` | uuid | composite FK → requests, cascade. `org_id` filled by trigger |
| `author_id` | uuid → auth.users | the session user (trigger); null for system rows |
| `body` | text, ≤2000 | required unless the row is a status change |
| `is_internal` | boolean | landlord-only note. **Tenants never get these rows** |
| `status_from`, `status_to` | `maintenance_status` | set only by the status trigger (not insertable) |
| `created_at` | timestamptz | |

RLS: members can select and insert on their org's requests. Tenants can select and insert only **non-internal** rows on their own requests. Insertable: `request_id, body, is_internal`.

### `maintenance_photos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id`, `request_id` | uuid | composite FK → requests, cascade. `org_id` filled by trigger |
| `storage_path` | text, unique | must be `{org_id}/{request_id}/…` and **exist** in the bucket (trigger) |
| `uploaded_by`, `created_at` | | |

At most 6 per request (`BB010`); bad or missing paths raise `BB011`. RLS (select/insert): `private.can_access_maintenance_request(request_id)`.

### `maintenance_overview` (view)
`security_invoker = true`. Request columns + `tenant_name`, `unit_number`, `property_id`, `property_name`, `photo_count`, `comment_count`. For landlord lists; tenants get no rows.

### Maintenance RPCs
| Function | Security | Purpose |
|---|---|---|
| `create_maintenance_request(p_tenancy_id, p_category, p_title, p_description) → (request_id, request_org_id)` | definer | The caller must be the tenant of that **active** tenancy. Returns ids so the browser can upload photos to the right path |
| `cancel_maintenance_request(p_request_id) → text` | definer | The reporting tenant can cancel while `pending`. Returns `cancelled`, `not_found` or `not_pending` |

### `notices`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `unique (org_id, id)` |
| `org_id` | uuid → organizations | cascade |
| `title` | text, 1–150 | |
| `body` | text, 1–5000 | |
| `audience` | `notice_audience` enum (`all`, `property`, `units`) | |
| `property_id` | uuid, nullable | composite FK → properties; set ⇔ audience `property` |
| `publish_at` | timestamptz | default now(); future = scheduled |
| `expires_at` | timestamptz, nullable | `> publish_at` |
| `created_by`, `created_at`, `updated_at` | | |

Indexes: `(org_id, publish_at desc)`, `(property_id, org_id)`, `(created_by)`. There are no landlord-only columns.

RLS:
- Members can select, insert and delete. There is no update; delete and re-create instead.
- Tenants can select `id in private.user_visible_notice_ids()`: published, unexpired, and aimed at one of their **active** tenancies (all / that property / that unit). This is evaluated live, with no fan-out rows.

Trigger: `NOTICE_CREATED` activity.

### `notice_units`
`(notice_id, unit_id)` PK, `org_id`. Composite FKs to notices and units (cascade); `(unit_id, org_id)` and `(org_id, notice_id)` indexes. Rows only for audience `units`. RLS: members only (select, insert).

### `notice_reads`
`(notice_id, user_id)` PK, `read_at`. `user_id` defaults to `auth.uid()`; cascade with the notice and the user. RLS: users can select their own rows, and members can select reads of their org's notices. Insert is allowed only for yourself and only for a notice you can currently see. Insertable: `notice_id`.

### `my_notices`, `notice_overview` (views)
`security_invoker = true`.
- `my_notices`: notice columns + `is_read` for the caller. Tenants get only notices they can see; it powers the inbox and the unread count.
- `notice_overview`: notices + `property_name`, `unit_count`, `read_count`, for landlords.

### `create_notice(p_org_id, p_title, p_body, p_audience, p_property_id, p_unit_ids uuid[], p_publish_at, p_expires_at) → uuid`
Security invoker. Inserts the notice and its `notice_units` rows atomically. A null `p_publish_at` means now. `units` with no units raises `BB012`; units from another org fail the composite FK.

### Dashboard RPCs (Phase 7, `20261003110000_dashboards`)
Both are `security invoker` and return one `jsonb` document, so each dashboard is a single round-trip and every figure is limited by the caller's RLS.

| Function | Returns |
|---|---|
| `landlord_dashboard(p_org_id) → jsonb` | `today`, `month` (org timezone); `properties`; `units` {total, occupied, vacant, maintenance, inactive}; `current_tenants`; `month_billed` (non-void charges for this billing month); `month_collected` (live payments with `paid_on` this month); `outstanding`; `overdue` {amount, count}; `overdue_tenants` (top 5); `vacant_units` (5); `maintenance` {open, pending}; `open_requests` (5 newest); `live_notices`; `activity` (10 latest, each with `subject` and `place` resolved in SQL). Returns null if the caller isn't a member of `p_org_id` |
| `tenant_dashboard() → jsonb` | `owed`, `overdue`, `next_due` (earliest open charge), `last_payment`, `open_requests`, `unread_notices`, over the caller's own tenancies |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `org_id`, `tenant_id` | uuid | composite FK → tenants, restrict |
| `recipient_user_id`, `recipient_email` | uuid / text | **filled by trigger from the tenant record** (not insertable), so landlords can only address their own tenants |
| `type` | `notification_type` enum (`payment_reminder`) | |
| `channel` | `notification_channel` enum (`in_app`, `email`, `sms`, `whatsapp`) | one row per channel delivery; sms/whatsapp have no provider yet (`BB014`) |
| `charge_id` | uuid, nullable | composite FK → charges; must belong to the tenant. Null for bulk reminders covering several charges |
| `subject` (1–200), `message` (1–4000) | text | plain text as sent |
| `status` | `notification_status` enum (`pending`, `sent`, `failed`) | inserted `pending`; set once to `sent`/`failed` (`BB013` after that) |
| `sent_at` | timestamptz | trigger-set with `sent` |
| `read_at` | timestamptz | in-app only, via `mark_notifications_read()` |
| `error` | text, ≤500 | provider error for `failed` |
| `created_by`, `created_at` | | |

Indexes: `(org_id, created_at desc)`, `(tenant_id, org_id, created_at desc)`, `(charge_id, org_id)`, partial `(recipient_user_id, created_at desc) where channel = 'in_app'`, `(created_by)`.

Triggers: `notifications_prepare` (recipients from the tenant, `BB014` if the channel can't reach them, delivery state machine). The statement-level `notifications_log_created` logs one `REMINDER_SENT` per tenant per send.

RLS:
- Members can select, insert, and update delivery fields. Insertable: `org_id, tenant_id, type, channel, charge_id, subject, message`; updatable: `status, error`.
- Tenants can select only their own `in_app` rows. They have no update policy and mark rows read through `mark_notifications_read(p_ids uuid[] default null) → int` (definer, own unread in-app rows only).

Delivery happens in Server Actions through `lib/notifications` providers ([ADR 0005](../adr/0005-notifications-provider-interface-resend.md)): in-app, Resend, or Mailpit in development.

### Functions & triggers
| Name | Kind | Purpose |
|---|---|---|
| `private.handle_new_user()` | trigger on `auth.users` insert, security definer | Creates the profile from signup metadata. Missing or invalid role → `tenant`. For landlords it also creates an organization and an owner membership |
| `private.custom_access_token_hook(event)` | Auth hook | Adds `app_metadata.user_role` to JWTs. Used for redirects only |
| `private.user_org_ids()` | security definer, stable | Org ids for `auth.uid()`; used in policies |
| `private.is_org_owner(org_id)` | security definer, stable | Owner check for org updates |
| `private.set_updated_at()` | trigger | Maintains `updated_at` on profiles, organizations, properties, units, tenants, tenancies |
| `private.log_activity(...)` | security definer | Inserts an `activity_log` row with `actor_id = auth.uid()` |
| `private.guard_tenancy()`, `private.sync_unit_occupancy()`, `private.enforce_unit_occupancy()` | triggers, security definer | Tenancy rules and the occupancy invariant (see `tenancies`, `units`) |
| `private.log_tenant_created()`, `private.log_tenancy_activity()`, `private.log_charge_activity()` | triggers, security definer | Activity log entries |
| `private.prepare_charge()`, `private.guard_payment()`, `private.apply_payment()` | triggers, security definer | Charge status derivation, payment rules, balance upkeep |
| `private.org_today(org_id)` | security definer, stable | Today in the org's time zone; used by `charge_balances` so tenants get correct overdue status |
| `private.user_tenant_ids()`, `private.user_tenancy_ids()`, `private.user_tenant_org_ids()` | security definer, stable | The caller's tenant records, tenancies and landlord orgs; used in tenant policies |
| `private.log_rent_generated(...)` | security definer | Logs `RENT_GENERATED` for orgs the caller belongs to |
| `private.can_access_maintenance_request(id)`, `private.can_access_maintenance_photo_path(name)` | security definer, stable | Member of the request's org, or its tenant; the path form also checks `{org_id}/{request_id}/…` (storage policies) |
| `private.prepare_maintenance_request()`, `private.log_maintenance_request()`, `private.prepare_maintenance_update()`, `private.prepare_maintenance_photo()` | triggers, security definer | Maintenance rules, status history, activity |
| `private.user_visible_notice_ids()`, `private.can_see_notice(id)` | security definer, stable | Notices aimed at the caller's active tenancies (set form used in policies) |
| `private.log_notice_created()` | trigger, security definer | `NOTICE_CREATED` activity |
| `private.prepare_notification()`, `private.log_notifications_created()` | triggers, security definer | Notification recipients, delivery state, `REMINDER_SENT` activity |

Default privileges: tables, sequences and functions created in `public` grant **nothing** to `anon`/`authenticated`, so every migration must grant explicitly.

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
| Tenant | No direct access to `tenants`, `tenancies`, `units` or `properties` (they hold landlord-only notes); reads go through `my_tenancies()` ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)). Links their login with `claim_tenant_invite()`. Reads their own non-void `charges` and `payments` directly (and `charge_balances`), plus charge types. Reads their own maintenance requests, **non-internal** updates and photos; creates and cancels requests via RPCs; comments publicly. Reads notices aimed at their current homes and records their own reads. Reads their own in-app notifications and marks them read via RPC |

Helpers in the `private` schema (not exposed through the API): `user_org_ids()`, `is_org_owner(org_id)`, `custom_access_token_hook(event)`. `user_tenant_ids()`, `user_tenancy_ids()`, `user_tenant_org_ids()`, `org_today(org_id)`. `user_visible_notice_ids()`, `can_see_notice(notice_id)`.

## Storage
| Bucket | Visibility | Path | Access |
|---|---|---|---|
| `maintenance-photos` | Private, 5 MB, jpeg/png/webp (created by migration `20261003090154_maintenance`) | `{org_id}/{request_id}/{uuid}.{ext}` | Select/insert on `storage.objects` via `private.can_access_maintenance_photo_path(name)`: org members and the tenant who owns the request. Uploaded straight from the browser; served via 1-hour signed URLs. No update/delete policies |
