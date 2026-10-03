# 0001 — Bari_bhara: Assessment, Architecture & Build Plan

- **Status:** Accepted
- **Date:** 2026-10-03
- **Related ADRs:** [0001](../adr/0001-supabase-as-backend.md) · [0002](../adr/0002-tenant-onboarding-via-invite-code.md) · [0003](../adr/0003-org-based-multi-tenancy-and-rls.md) · [0004](../adr/0004-unified-charges-table-and-derived-overdue.md) · [0005](../adr/0005-notifications-provider-interface-resend.md) · [0006](../adr/0006-local-supabase-cli-workflow.md) · [0007](../adr/0007-tenant-reads-through-safe-functions.md)
- **Database reference:** [architecture/database.md](../architecture/database.md)

### Progress
- [x] 0. Project documentation
- [x] 1. Foundation
- [x] 2. Properties
- [x] 3. Tenants
- [x] 4. Rent & bills
- [ ] 5. Maintenance
- [ ] 6. Notices
- [ ] 7. Dashboards
- [ ] 8. Notifications
- [ ] 9. Polish
- [ ] 10. Deployment

> This is a living document. When a phase lands, tick its box. When the plan changes, edit the plan and record the reason under "Changelog" at the bottom. Significant architectural changes also need a new ADR.

## Context
Bari_bhara is a rental and property management SaaS for landlords and tenants: properties, units, tenancies, rent and utility charges, payments, maintenance, notices and reminders. It runs on Next.js + Supabase and deploys to Vercel. The repo is a fresh **Supabase Next.js starter**, so this plan covers the full architecture and a phased roadmap, then details Phase 1, which is implemented first.

Decisions the user made:
- **Tenant onboarding:** the tenant signs up, then enters an invite code the landlord generated, which links their login to the tenant record. No service-role key is needed.
- **Supabase dev:** a local stack via the Supabase CLI + Docker. Migrations are pushed to the hosted project.
- **Reminders v1:** in-app notifications plus email via Resend, behind a provider interface.
- **Locale:** currency stored per organization (default BDT, ৳). The UI is English, with strings kept centralized so Bengali can be added later.

---

## 0. Project documentation (done first, before Phase 1)
The user wants this plan and all future project documents kept in the repo, where any agent can refer to them. The layout follows the common `docs/` + ADR (Architecture Decision Record) convention:
```
docs/
  README.md                     index of all docs + how to add new ones (naming, status, template)
  plans/
    0001-initial-architecture-and-roadmap.md   ← this plan (repo-relative links, status: Accepted)
  adr/                          one short, immutable record per significant decision (MADR-style:
    0000-template.md              Context / Decision / Consequences / Status)
    0001-supabase-as-backend.md
    0002-tenant-onboarding-via-invite-code.md
    0003-org-based-multi-tenancy-and-rls.md
    0004-unified-charges-table-and-derived-overdue.md
    0005-notifications-provider-interface-resend.md
    0006-local-supabase-cli-workflow.md
  architecture/
    database.md                 living ERD, table/RLS reference; updated with every migration
```
Conventions:
- Files are numbered and kebab-cased.
- ADRs are never rewritten. A changed decision gets a new ADR that marks the old one "Superseded by NNNN".
- Plans are living documents: the status line and phase checkboxes are updated as work lands.
- Add a short "Project docs" section to [AGENTS.md](../../AGENTS.md), outside the auto-generated Next.js block. It tells agents to read `docs/README.md`, follow the relevant plan and ADRs, and add or update docs when they change architecture. [CLAUDE.md](../../CLAUDE.md) already imports AGENTS.md, so Claude picks this up too.
- Save a memory pointing at this convention.
- Commit on branch `docs/initial-plan` (from `dev`) as `docs: add project documentation structure and initial plan`.
- **Then stop.** The user reviews the docs before Phase 1 begins.

---

## 1. Repository assessment
| Area | State |
|---|---|
| Framework | **Next.js 16.3.6** (App Router, `proxy.ts` replaces middleware, `cacheComponents: true` in [next.config.ts](../../next.config.ts)), React 19.3, TS strict |
| Styling | Tailwind **3.4** + shadcn/ui (new-york, [components.json](../../components.json)), next-themes, lucide |
| UI present | [components/ui/](../../components/ui/): button, card, input, label, badge, checkbox, dropdown-menu. Starter forms: login, sign-up, forgot/update password |
| Supabase | `@supabase/ssr` 0.12 + supabase-js 2.117. [lib/supabase/server.ts](../../lib/supabase/server.ts), [client.ts](../../lib/supabase/client.ts), [proxy.ts](../../lib/supabase/proxy.ts) (`getClaims()` session refresh + login redirect). Uses the new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Auth | Email/password pages under `app/auth/*`, `auth/confirm` route. No roles, no profiles |
| Database | **None**: no `supabase/` folder, no migrations, no CLI installed. [app/instruments/page.tsx](../../app/instruments/page.tsx) is demo code |
| Issues | Two lockfiles (`package-lock.json` + `pnpm-lock.yaml`); deps pinned to `"latest"`; `eslint-config-next` 15.3.1 vs next 16; no `.env.example`; no tests |

---

## 2. Architecture
```
Browser (mobile-first React UI)
   ↓  Server Components (reads) · Server Actions (writes) · few Client Components (forms, interactivity)
Next.js 16 on Vercel
   ├─ proxy.ts ........ session refresh + *optimistic* role redirect (reads JWT claim, no DB call)
   ├─ lib/dal.ts ...... verifySession()/requireRole() with React cache(), used by layouts & actions
   └─ lib/notifications  provider interface → InAppProvider, ResendEmailProvider (server-only)
   ↓  @supabase/ssr (user's JWT, publishable key only)
Supabase
   ├─ Auth (email/password; Custom Access Token Hook adds `user_role` claim)
   ├─ Postgres: normalized schema, triggers (balances, occupancy, activity log), RPCs
   ├─ RLS on every table: the real security boundary
   └─ Storage: private buckets, path-scoped policies, signed URLs
```
Principles:
- Authorization lives in **RLS**. Proxy and layouts only redirect for UX.
- There is no separate backend. Multi-row operations (rent generation, invite claiming) are Postgres RPCs.
- **No service-role key** anywhere in the app. Server-only secrets are `RESEND_API_KEY` and `EMAIL_FROM`.
- With `cacheComponents`, auth-dependent data is read inside `<Suspense>`. Follow `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` before writing auth/layout code.
- Keep the root-level `app/`, `components/` and `lib/` layout that already exists (no `src/` move). Add `features/<domain>/` for domain components, queries, actions and zod schemas.

### Folder structure
```
app/
  (public)/page.tsx, login/, signup/, forgot-password/, update-password/
  auth/confirm/route.ts
  (landlord)/layout.tsx  → requireRole('landlord'); sidebar + mobile bottom nav
    dashboard/ properties/[id] units/[id] tenants/{new,[id]} rent/[id] bills/ payments/
    maintenance/[id] notices/{new,[id]} settings/
  tenant/
    join/                → enter invite code (signed-in tenant without linked record)
    (portal)/layout.tsx  → requireRole('tenant') + linked check
      dashboard/ rent/ payments/ maintenance/{new,[id]} notices/[id] profile/
components/ui/           shadcn primitives
components/app/          AppShell, Sidebar, MobileNav, PageHeader, EmptyState, StatCard,
                         StatusBadge, DataTable↔CardList (responsive), ConfirmDialog, Money
features/<domain>/       queries.ts, actions.ts, schema.ts (zod), components/
lib/supabase/            server.ts, client.ts, proxy.ts, database.types.ts (generated)
lib/dal.ts, lib/format.ts (money/date, Asia/Dhaka), lib/strings.ts, lib/notifications/
types/                   domain types derived from generated DB types
supabase/                config.toml, migrations/, seed.sql
docs/                    project documentation (see §0)
e2e/                     Playwright specs
```

---

## 3. Database design

### Entity relationships
```
auth.users 1─1 profiles (role: landlord|tenant)
organizations 1─* organization_members *─1 profiles        (owner|manager: future property managers)
organizations 1─* properties 1─* units 1─* tenancies *─1 tenants (─0..1 auth user via user_id)
tenants 1─* tenant_invites
tenancies 1─* charges ─*─1 charge_types      charges 1─* payments
units/tenancies 1─* maintenance_requests 1─* maintenance_updates, maintenance_photos
organizations 1─* notices 1─* notice_units ; notices 1─* notice_reads
organizations 1─* notifications (→ tenant, → charge)     organizations 1─* activity_log
```

### Tables (all `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`; money is `numeric(12,2)`; lowercase snake_case)
- **profiles**: `id → auth.users`, `role` enum, `full_name`, `phone`. Created by a trigger on `auth.users` insert. Role comes from signup metadata, restricted to `landlord|tenant`. Users cannot update `role` (column privilege revoked).
- **organizations**: `name`, `currency` (default `'BDT'`), `timezone` (default `'Asia/Dhaka'`). Signing up as a landlord automatically creates an org and an `owner` membership. This puts "multiple landlords / property managers" in place now at almost no cost.
- **organization_members**: `(org_id, user_id)` PK, `role` enum `owner|manager`.
- **properties**: `org_id`, `name`, `address`, `city`, `rent_due_day` (1–28, default 5), `archived_at`.
- **units**: `org_id`, `property_id`, `unit_number`, `floor`, `unit_type`, `bedrooms`, `default_rent`, `status` enum `vacant|occupied|maintenance|inactive`. `unique(property_id, unit_number)`. A trigger keeps `occupied`/`vacant` in sync with active tenancies.
- **tenants** (the person): `org_id`, `full_name`, `phone`, `email`, `notes`, `user_id` nullable → auth.users. `unique(org_id, user_id)`. Tenants can exist without a login.
- **tenancies**: `org_id`, `tenant_id`, `unit_id`, `monthly_rent`, `security_deposit`, `move_in_date`, `move_out_date`, `move_out_reason`, `move_out_notes`, `status` enum `active|moved_out`. **Partial unique index**: one active tenancy per unit. Moving out updates the row; nothing is ever deleted.
- **tenant_invites**: `org_id`, `tenant_id`, `code_hash` (sha256), `expires_at` (7 days), `used_at`, `created_by`. RPC `claim_tenant_invite(code)` is security definer and checks: the caller is a tenant, the code is unexpired and unused, and the tenant record is unlinked. It then sets `tenants.user_id = auth.uid()`. Codes are 10 characters of base32 (~50 bits), single use. Failed attempts are counted per user, with a lockout after 10.
- **charge_types**: `org_id` (null = system default), `key`, `label`, `category` enum `rent|utility`. Seeded with rent, electricity, gas, water, internet, other. New bill types are just new rows.
- **charges**: one table for **both rent and utility bills**, because they share one lifecycle, one payments FK and one balance query. The UI still separates /rent and /bills by category. Columns: `org_id`, `tenancy_id`, `unit_id`, `charge_type_id`, `billing_month` (date, first of month), `amount`, `due_date`, `amount_paid` (trigger-maintained), `status` enum `unpaid|partially_paid|paid|void`, `notes`. Rent is idempotent through a partial unique index on `(tenancy_id, billing_month)` where the type is rent.
- **payments**: `org_id`, `charge_id`, `amount > 0`, `paid_on`, `method` enum `cash|bank_transfer|bkash|nagad|card|other`, `reference`, `recorded_by`, `voided_at`, `void_reason`. An after insert/update trigger recomputes `charges.amount_paid` and `status`, and rejects overpayment. Corrections are voids, never deletes.
- **Overdue** is not stored, so it can never drift without a cron job. The view `charge_balances` (`security_invoker = true`) exposes `outstanding` and `effective_status`, which becomes `overdue` when the charge is unpaid or partially paid and `due_date` is before today in the org's timezone. All dashboards and tenant balances read this view.
- **maintenance_requests**: `org_id`, `unit_id`, `tenancy_id`, `tenant_id`, `created_by`, `category` enum (plumbing, electrical, air_conditioning, water, door_lock, internet, appliance, other), `title`, `description`, `status` enum `pending|in_progress|resolved|cancelled`, `assigned_to` (text, for future vendors), `resolved_at`, `updated_at`. A trigger forces `status='pending'` on tenant inserts and allows tenants only `pending→cancelled`.
- **maintenance_updates**: `request_id`, `author_id`, `body`, `is_internal`, `status_from`, `status_to`. Status changes write a row automatically, which gives the request its history.
- **maintenance_photos**: `request_id`, `storage_path`. Private bucket `maintenance-photos`, path `{org_id}/{request_id}/{uuid}.{ext}`. Storage policies check the folder against the org or the tenant's own request. Photos are served through signed URLs.
- **notices**: `org_id`, `title`, `body`, `audience` enum `all|property|units`, `property_id`, `publish_at`, `expires_at`, `created_by`. **notice_units**: `(notice_id, unit_id)`. **notice_reads**: `(notice_id, user_id)` PK, `read_at`. Targeting is evaluated **dynamically** in RLS, so a tenant who moves in later sees current notices with no fan-out rows.
- **notifications**: `org_id`, `tenant_id`, `recipient_user_id` (nullable), `type` enum (payment_reminder, …), `channel` enum `in_app|email|sms|whatsapp`, `charge_id`, `subject`, `message`, `status` enum `pending|sent|failed`, `sent_at`, `read_at`, `error`, `created_by`. There is one row per channel delivery.
- **activity_log**: `org_id`, `actor_id`, `event_type` (TENANT_CREATED, TENANT_MOVED_OUT, RENT_CREATED, PAYMENT_RECORDED, MAINTENANCE_CREATED, MAINTENANCE_STATUS_CHANGED, NOTICE_CREATED, …), `entity_type`, `entity_id`, `metadata jsonb`. Written by security-definer triggers. It powers the dashboard's "recent activity" and doubles as the audit trail.

### Integrity
- Every child table carries `org_id`. **Composite FKs** (e.g. `(org_id, property_id) → properties(org_id, id)`) make cross-org mismatches impossible, and RLS stays a cheap single-column check.
- CHECK constraints: amounts ≥ 0, `move_out_date >= move_in_date`, `expires_at > publish_at`, and `billing_month` is the first of the month.

### Indexes
- Every FK column, plus `org_id`.
- `units(property_id, status)`, `tenancies(tenant_id)`, partial `tenancies(unit_id) where status='active'`.
- `charges(tenancy_id, billing_month)`, partial `charges(org_id, due_date) where status in ('unpaid','partially_paid')`.
- `payments(charge_id)`, `maintenance_requests(org_id, status, created_at desc)`, `notices(org_id, publish_at desc)`, `activity_log(org_id, created_at desc)`, `tenants(org_id, full_name)` (search).

### RLS strategy
- RLS is enabled on every table. Revoke all privileges from `anon`. `authenticated` gets only the needed privileges, with column-level revokes (e.g. `profiles.role`).
- Helpers live in an unexposed `private` schema as `security definer stable` functions with `set search_path = ''`:
  - `private.user_org_ids()`: orgs the user is a member of.
  - `private.user_tenant_ids()`: `tenants.id where user_id = auth.uid()`.
  - `private.can_see_notice(notice_id)`.
- Policies wrap helpers as `(select private.fn())` so Postgres evaluates them once per query instead of per row.
- **Landlord or manager:** full CRUD where `org_id in (select private.user_org_ids())`.
- **Tenant (read-only unless noted):**
  - Own `tenants` row and own `tenancies`, plus the `units` and `properties` of those tenancies.
  - `charges` and `payments` through own tenancies.
  - Maintenance requests: select and insert own. The insert is checked against the tenant's active tenancy unit.
  - `maintenance_updates`: rows on own requests where `not is_internal`, and they can insert non-internal comments.
  - Notices: rows where `can_see_notice`.
  - `notice_reads`: insert and select own.
  - Own `notifications`.
- **Custom Access Token Hook** (`private.custom_access_token_hook`) adds `user_role` to the JWT. Only `proxy.ts` uses it, for redirects. RLS never trusts `user_metadata`.

---

## 4. Implementation roadmap (one feature branch + small commits per phase; app works after each)
| Phase | Branch | Scope | Done when |
|---|---|---|---|
| **1 Foundation** | `feature/foundation` | Housekeeping, Supabase local, base schema (profiles/orgs/members), auth + roles, DAL, app shells | See Phase 1 detail |
| 2 Properties | `feature/property-management` | properties, units migrations + RLS; list/detail/create/edit; vacant/occupied filters | Landlord B can't see landlord A's data (checked manually with seeded accounts) |
| 3 Tenants | `feature/tenant-management` | tenants, tenancies, invites, occupancy trigger, activity_log; add tenant (creates tenant + tenancy), list (search/filter/sort/paginate), details, move-out, invite code + `/tenant/join` | Move-out keeps history; tenant links via code |
| 4 Rent & bills | `feature/rent-management` | charge_types, charges, payments, balance triggers, `charge_balances` view, `generate_monthly_rent` RPC; /rent, /bills, /payments, record/void payment, tenant /rent & /payments | Status is correct for partial, full and overdue (checked against seed data) |
| 5 Maintenance | `feature/maintenance` | requests, updates, photos + storage bucket/policies; tenant create/list/cancel; landlord filter/status/internal notes/comments | Tenant can't see internal notes or others' requests |
| 6 Notices | `feature/notices` | notices, notice_units, notice_reads; create with targeting; tenant inbox, unread badge, mark read | Targeting works for all, property, units and expired notices |
| 7 Dashboards | `feature/dashboards` | Landlord and tenant dashboards as aggregated RPCs/views (one round-trip each), recent activity | Answers the §38 questions at a glance |
| 8 Notifications | `feature/notifications` | `lib/notifications` provider interface, InApp + Resend providers, "Send reminder" (single + bulk overdue), tenant notification list | Rows record sent/failed; email arrives in dev (Resend test) |
| 9 Polish | `feature/polish` | Mobile pass at 360–1440px, a11y audit, loading/empty/error states, `error.tsx`/`not-found.tsx`, perf (select columns, pagination), full Playwright suite | All tests green |
| 10 Deploy | `feature/deployment` | Hosted Supabase config (auth URLs, custom SMTP via Resend, token hook enabled), `supabase db push`, Vercel env vars, security review (`supabase db lint`, advisors) | Production smoke test |

### Phase 1 detail (implemented first)
1. **Housekeeping**
   - Standardize on **pnpm**: delete `package-lock.json`.
   - Pin `next`, `@supabase/ssr` and `@supabase/supabase-js` to their installed versions. Bump `eslint-config-next` to 16.x.
   - Remove the starter demo: `app/instruments`, `app/protected`, `components/tutorial`, `hero`, `deploy-button`, `next-logo`, `supabase-logo`, `env-var-warning`.
2. **Dependencies**
   - Runtime: `zod`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `date-fns`.
   - Dev: `supabase` (CLI), `@playwright/test`.
   - shadcn: dialog, sheet, select, form, table, tabs, separator, skeleton, avatar, sonner.
3. **Supabase**
   - `pnpm supabase init`, then configure `supabase/config.toml` (site_url, redirect URLs, enable the custom access token hook).
   - Migration `…_foundation.sql`:
     - enums;
     - `profiles`, `organizations`, `organization_members`;
     - the `handle_new_user` trigger (creates the profile, plus an org and owner membership for landlords);
     - `private` helpers;
     - the token hook;
     - RLS, grants and revokes.
   - `supabase/seed.sql`: landlord A, landlord B and tenant users with fake data.
   - `pnpm db:types` generates `lib/supabase/database.types.ts`. Make `createClient<Database>()` typed in server, client and proxy.
4. **Auth & routing**
   - Rework the existing forms: signup gets a role choice ("I manage property" / "I'm a tenant").
   - Move routes to `/login`, `/signup`, `/forgot-password`, `/update-password`, and keep `auth/confirm`.
   - `lib/supabase/proxy.ts`: public allowlist, unauthenticated → `/login?next=`, role redirect from the `user_role` claim (landlord ↔ `/tenant/*` blocked). After login, go to `/dashboard` or `/tenant/dashboard`.
   - `lib/dal.ts`: `verifySession()` and `requireRole()`, memoized with `cache()`. These are used in group layouts and every server action. Expired sessions go to `/login`.
5. **UI shell**
   - Landlord `AppShell` has a sidebar on desktop and a bottom nav + sheet on mobile. The tenant shell has its own nav.
   - Add placeholder pages for every nav item, each with an `EmptyState`.
   - Add shared `PageHeader`, `EmptyState` and `StatCard`, plus a sonner toaster.
6. **Config**: `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`. Package scripts: `db:start`, `db:reset`, `db:types`, `test:e2e`, `typecheck`.
7. **Tests** (no unit tests for now, per the user; E2E only)
   - Playwright: signup/login redirects per role, logout, unauthenticated redirect, tenant blocked from `/dashboard`.

### Phase 2 detail (Properties & units)
Branch `feature/property-management` from `main`. Small commits: db → feature code → UI → tests → docs.

1. **Migration `…_properties_and_units.sql`**
   - Enum `unit_status` (`vacant|occupied|maintenance|inactive`).
   - `properties`: `org_id`, `name` (1–120), `address` (≤300), `city` (≤80), `rent_due_day` (smallint 1–28, default 5), `notes` (≤1000), `archived_at`, `created_at`, `updated_at`. `unique (org_id, id)` is the target for child composite FKs and also serves as the `org_id` index.
   - `units`: `org_id`, `property_id`, `unit_number` (1–20), `floor` (≤20, text so "G"/"Ground" work), `unit_type` (≤40, e.g. "2 bed flat", "Shop"), `bedrooms` (0–20, nullable), `default_rent` (`numeric(12,2)` ≥ 0), `status` (default `vacant`), `notes`, timestamps. Composite FK `(org_id, property_id) → properties (org_id, id)` **on delete restrict**: a property with units can only be archived, not deleted. `unique (property_id, unit_number)`, `unique (org_id, id)` (for Phase 3+ composite FKs), index `units (property_id, status)`.
   - `org_id` and `property_id` are not updatable (column-level grants), so a unit can't move between properties or orgs.
   - View `property_overview` (`security_invoker = true`): each property plus `unit_count`, `occupied_count`, `vacant_count`, so the property list is one query.
   - RLS: org members get select/insert/update/delete on both tables (`org_id in (select private.user_org_ids())`). Tenant read policies on properties/units need `tenancies`, so they come in Phase 3.
   - Seed: landlord A gets 2 properties with units in mixed statuses; landlord B gets 1 property. Fixed UUIDs so tests and manual checks can reference them.
2. **Unit status in Phase 2:** the form allows `vacant`, `maintenance` and `inactive`. `occupied` is reserved for the Phase 3 occupancy trigger (driven by active tenancies), so it is shown and filterable but not hand-set. A server-side check rejects it.
3. **Feature code** (`features/properties/`, `features/units/`): zod `schema.ts`, `queries.ts` (server-only, called inside the layout's Suspense boundary), `actions.ts` (every action calls `requireRole('landlord')`, validates with zod, returns `ActionResult` or redirects, and calls `refresh()`/redirect after writes). The org id for inserts comes from `getCurrentOrganization()`; RLS `with check` is the real guard.
4. **Routes**
   - `/properties`: card grid with unit counts; "Show archived" toggle (`?archived=1`).
   - `/properties/new`, `/properties/[id]/edit`.
   - `/properties/[id]`: details, unit stats, the property's units with status filter, "Add unit", archive/restore, delete (only when it has no units).
   - `/units`: all units across non-archived properties, filters by status and property via `searchParams` (links, no client JS).
   - `/units/new?propertyId=`, `/units/[id]`, `/units/[id]/edit`, delete with confirmation.
   - Unknown or other-org ids render `notFound()` (RLS returns no row).
5. **Shared UI:** `lib/format.ts` (`formatMoney` with the org currency, `formatDate` in Asia/Dhaka), `StatusBadge`-style `UnitStatusBadge`, `FilterChips`, `ConfirmDialog`, a responsive units list (table ≥ md, cards below). shadcn: `select`, `alert-dialog`, `table`, `textarea`.
6. **Tests (E2E):** landlord A creates a property, adds a unit, edits it, filters by status; duplicate unit number shows a field error; landlord B sees none of A's properties and gets a 404 on A's property URL; tenant is redirected away from `/properties`.
7. **Docs:** update `architecture/database.md` (tables, view, policies), tick Phase 2, changelog.

### Phase 3 detail (Tenants, tenancies & invites)
Branch `feature/tenant-management` from `main`. Commits: db → feature code/UI → tenant portal → tests → docs.

1. **Migration `…_tenants_and_tenancies.sql`**
   - Enum `tenancy_status` (`active|moved_out`).
   - `tenants`: `org_id`, `full_name` (1–120), `phone` (≤30), `email` (≤254), `notes` (≤1000, landlord-only), `user_id` → auth.users (nullable, set only by the claim RPC), timestamps. `unique (org_id, id)`, `unique (org_id, user_id)`, index `user_id`, index `(org_id, full_name)`.
   - `tenancies`: `org_id`, `tenant_id`, `unit_id` (composite FKs to `tenants`/`units` `(org_id, id)`, **on delete restrict**), `monthly_rent`, `security_deposit` (`numeric(12,2)` ≥ 0), `move_in_date`, `move_out_date`, `move_out_reason` (≤120), `move_out_notes` (≤1000, landlord-only), `status`, `created_by`, timestamps. Checks: `move_out_date >= move_in_date`; `status = 'moved_out'` ⇔ `move_out_date is not null`. Partial unique index: one active tenancy per unit. No delete grant: history is never deleted.
   - Guard trigger: a tenancy can only go `active → moved_out`; a moved-out tenancy's dates, rent, unit and tenant are frozen. New tenancies are rejected for `inactive` units and archived properties.
   - **Occupancy:** after insert/update on `tenancies`, the unit becomes `occupied` while it has an active tenancy, and `vacant` when the last one ends. A `units` trigger enforces the invariant `status = 'occupied'` ⇔ an active tenancy exists, so `occupied` can't be hand-set even through the API.
   - `tenant_invites`: `org_id`, `tenant_id` (cascade), `code_hash` (sha256 hex, unique), `expires_at` (7 days), `used_at`, `used_by`, `created_by`, `created_at`. Landlords can select every column except `code_hash`; there are no write grants.
   - `private.invite_claim_failures` (`user_id`, `failed_count`, `last_failed_at`): 10 failures lock claiming for 24 hours, and a success resets the count.
   - `activity_log`: `org_id`, `actor_id`, `event_type`, `entity_type`, `entity_id`, `metadata`, `created_at`, index `(org_id, created_at desc)`. Members can select it; only security-definer triggers and RPCs write to it. Events this phase: `TENANT_CREATED`, `TENANT_MOVED_IN`, `TENANT_MOVED_OUT`, `TENANT_INVITE_CREATED`, `TENANT_LINKED`.
   - RPCs:
     - `add_tenant(...)` (invoker): creates the tenant and the first tenancy atomically under the caller's RLS.
     - `create_tenant_invite(tenant_id)` (definer, checks org membership): generates a 10-character Crockford base32 code from `gen_random_bytes`, stores only its hash, replaces any unused code, and returns the plaintext once.
     - `claim_tenant_invite(code)` (definer): normalizes the code (uppercase, strip spaces/dashes, `O→0`, `I/L→1`). It returns a status (`linked|invalid|locked|not_tenant|already_linked`) instead of raising, so the failure counter isn't rolled back.
     - `my_tenancies()` (definer): the caller's tenancies with **only tenant-safe columns** (see ADR 0007).
   - View `tenant_overview` (`security_invoker`): each tenant with their current (or latest) tenancy, unit and property, and `has_login`. It backs the tenant list.
   - Tenants get **no direct RLS read access** to `tenants`, `tenancies`, `units` or `properties`, which contain landlord-only notes ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)).
   - Seed: landlord A has 3 active tenancies (one linked to `tenant.a`) and 1 moved-out tenancy. Landlord B has 1 active tenancy plus an unlinked tenant with a known local-only invite code for manual testing.
2. **Landlord UI** (`features/tenants/`)
   - `/tenants`: search by name/phone/email (`?q=`), filter current/past (`?status=`) and property, sort (name, newest, move-in), 20 per page.
   - `/tenants/new`: tenant details + vacant unit picker + rent (prefilled from the unit's default rent) + deposit + move-in date. `?unitId=` preselects the unit.
   - `/tenants/[id]`: contact details, app access (connected / invite code with expiry / create or replace code, shown once with copy), current tenancy with **Move out** (date ≤ today, reason, notes), tenancy history, and "Move into a unit" when there's no active tenancy.
   - `/tenants/[id]/edit`, `/tenants/[id]/move-in`.
   - Unit detail shows the current tenant and the unit's tenancy history, with "Add tenant" when the unit is available.
   - Archiving a property with active tenancies is refused.
3. **Tenant portal**
   - Move the tenant pages under `app/tenant/(portal)/`, whose layout requires a linked tenant (`my_tenancies()` non-empty) and otherwise redirects to `/tenant/join`.
   - `/tenant/join`: enter the invite code, with friendly messages per status.
   - The tenant dashboard shows their home(s): property, unit, rent, due day, move-in date and landlord name.
4. **Tests (E2E):**
   - Landlord adds a tenant to a vacant unit; the unit becomes occupied; search/filter finds them.
   - Move-out keeps history and frees the unit.
   - Landlord creates an invite, a new tenant signs up, is sent to `/tenant/join`, claims the code and sees their home. A reused code is rejected.
   - Landlord B can't see A's tenants.
   - Tenant signup now lands on `/tenant/join`.
5. **Docs:** ADR 0007, `architecture/database.md`, tick Phase 3, changelog.

### Phase 4 detail (Rent, bills & payments)
Branch `feature/rent-management` from `main`. Follows [ADR 0004](../adr/0004-unified-charges-table-and-derived-overdue.md). Commits: db → landlord UI → tenant UI → tests → docs.

1. **Migration `…_charges_and_payments.sql`**
   - Enums: `charge_category` (`rent|utility`), `charge_status` (`unpaid|partially_paid|paid|void`), `payment_method` (`cash|bank_transfer|bkash|nagad|card|other`).
   - `charge_types`: `org_id` (null = system default), `key`, `label`, `category`. `unique nulls not distinct (org_id, key)`. Seeded system types: rent, electricity, gas, water, internet, other. Custom (org) types must be `utility`; there's no UI for them yet.
   - `charges`:
     - Columns: `org_id`, `tenancy_id`, `unit_id`, `charge_type_id`, `category`, `billing_month`, `amount` (> 0), `due_date`, `amount_paid`, `status`, `description` (≤200, tenant-visible), `voided_at`, `void_reason`, `created_by`, timestamps.
     - FKs: composite `(org_id, tenancy_id) → tenancies`, `(org_id, unit_id) → units`.
     - A before trigger fills `unit_id` and `category` from the tenancy and type, and checks that the type belongs to the org or the system.
     - Checks: `billing_month` is the 1st; `0 ≤ amount_paid ≤ amount`.
     - **Status is derived in a before trigger** from `amount_paid` vs `amount`. The only status a user can set is `void`, and only with no live payments. A voided charge is frozen.
     - Partial unique index `(tenancy_id, billing_month) where category = 'rent' and status <> 'void'` makes rent generation idempotent and lets a voided rent charge be regenerated.
   - `payments`: `org_id`, `charge_id` (composite FK), `amount` (> 0), `paid_on`, `method`, `reference` (≤100), `recorded_by`, `voided_at`, `void_reason`, `created_at`.
     - After insert / void, a trigger locks the charge, recomputes `amount_paid` from live payments and **rejects overpayment**.
     - There are no deletes. The only update is voiding, once, never undone. No payments on void charges.
   - `private.org_today(org_id)`: today's date in the org's timezone (security definer, so tenants can use it).
   - Views (`security_invoker`):
     - `charge_balances`: charges + type label + `outstanding` + `effective_status` (`overdue` when unpaid/partially paid and `due_date < org_today`). Used by both roles.
     - `charge_overview`: `charge_balances` + tenant, unit and property names, for landlord lists.
   - RPC `generate_monthly_rent(p_month date, p_property_id uuid default null) → int` (invoker): one rent charge per active tenancy (moved in by the month's end) in the property, or in all of the caller's non-archived properties. Amount = tenancy rent; due = the property's `rent_due_day` in that month; `on conflict do nothing`. Returns the number created.
   - Activity: `RENT_GENERATED` (one per RPC call, with count), `BILL_CREATED`, `CHARGE_VOIDED`, `PAYMENT_RECORDED`, `PAYMENT_VOIDED`.
   - RLS:
     - Landlord/manager: select/insert/update on `charges` and `payments` in their orgs. There are no deletes.
     - Tenant: **direct select** on their own non-void `charges` and non-void `payments`. These tables have no landlord-only columns, which ADR 0007 allows. Uses new helpers `private.user_tenant_ids()` and `private.user_tenancy_ids()`.
     - `charge_types`: system rows for everyone signed in; org rows for members and that org's tenants.
   - Seed, relative to `current_date` so overdue stays deterministic: rent for the last 3 months in both orgs via the RPC. Payments make one charge paid, one partly paid, one previous-month charge unpaid (always overdue), plus one voided payment. Two utility bills: one overdue, one paid.
2. **Landlord UI** (`features/charges/`, `features/payments/`)
   - `/rent`: month picker (`?month=YYYY-MM`, default this month in the org timezone); stats (billed, collected, outstanding, overdue); "Generate rent for <month>"; status and property filters.
   - `/bills`: same layout for utilities, plus a type filter; `/bills/new` (active tenancy, type, month, amount, due date, description).
   - `/rent/[id]`, `/bills/[id]`: charge detail with payments, **Record payment** (amount defaults to outstanding, date ≤ today, method, reference), **Void payment** (reason), **Void charge** (reason; only with no live payments).
   - `/payments`: all payments, newest first, method filter, show-voided toggle, 20 per page.
   - The tenant page gets a balance card (outstanding total + recent charges).
3. **Tenant UI**
   - `/tenant/rent`: amount owed, then their charges (overdue first) with status.
   - `/tenant/payments`: payment history.
4. **Tests (E2E):**
   - Generating rent is idempotent.
   - A partial payment shows *Partly paid*, and paying the rest shows *Paid*.
   - Overpayment is rejected.
   - Voiding a payment restores the balance.
   - A previous-month unpaid charge shows *Overdue*.
   - Adding a bill works.
   - The tenant sees their charges and payments.
   - Landlord B sees none of A's charges.
5. **Docs:** `architecture/database.md`, tick Phase 4, changelog.

### Phase 5 detail (Maintenance)
Branch `feature/maintenance`, **stacked on `feature/rent-management`** (Phase 4 isn't merged yet, and both phases append to the seed and docs). Merge order: 4 → 5 → 6.

1. **Migration `…_maintenance.sql`**
   - Enums: `maintenance_category` (plumbing, electrical, air_conditioning, water, door_lock, internet, appliance, other) and `maintenance_status` (pending, in_progress, resolved, cancelled).
   - `maintenance_requests`: `org_id`, `unit_id` (composite FK), `tenancy_id`, `tenant_id` (nullable, for landlord-raised issues), `created_by`, `category`, `title` (3–120), `description` (≤2000), `status`, `assigned_to` (≤120, e.g. a plumber's name), `resolved_at`, timestamps. No landlord-only columns, so tenants read their own requests directly (ADR 0007).
   - `maintenance_updates`: `org_id`, `request_id`, `author_id`, `body` (≤2000), `is_internal`, `status_from`, `status_to`, `created_at`.
     - A before trigger fills `org_id` and `author_id`.
     - Users can't write `status_*`. Status changes on a request add a row automatically (security-definer trigger), giving the request its history.
     - Tenants see and post only non-internal rows on their own requests.
   - `maintenance_photos`: `org_id`, `request_id`, `storage_path` (unique, must be `{org_id}/{request_id}/…`), `uploaded_by`, `created_at`. At most 6 per request.
   - Storage: private bucket `maintenance-photos` (5 MB; jpeg/png/webp), created by the migration so hosted gets it too. `storage.objects` policies use `private.can_access_maintenance_request(request_id)` (org member, or the tenant who owns the request) on the path's second folder, and check that the first folder is the request's org. Photos are served through short-lived signed URLs.
   - RPCs (definer):
     - `create_maintenance_request(p_tenancy_id, p_category, p_title, p_description)`: the caller must be the tenant of that **active** tenancy. Status is always `pending`.
     - `cancel_maintenance_request(p_request_id)`: the requesting tenant can cancel only while `pending`.
   - Landlords insert and update requests directly under RLS (any status change; `resolved_at` is kept in sync).
   - View `maintenance_overview` (`security_invoker`): requests + tenant, unit and property names + photo count, for landlord lists.
   - Activity: `MAINTENANCE_CREATED`, `MAINTENANCE_STATUS_CHANGED`.
   - Seed: a pending request with a comment, an in-progress one with an internal note, a resolved one, and one in landlord B's org.
2. **Landlord UI** (`features/maintenance/`)
   - `/maintenance`: open/pending/in progress/resolved/cancelled/all filters (default *open*), property and category filters, newest first.
   - `/maintenance/new`: raise an issue for any unit.
   - `/maintenance/[id]`: details, photos, change status (with an optional note), assign, timeline, comment or internal note, add photos.
3. **Tenant UI**
   - `/tenant/maintenance`: their requests plus "Report a problem".
   - `/tenant/maintenance/new`: home (if several), category, title, description, photos. The browser uploads straight to Storage, then the server records the paths.
   - `/tenant/maintenance/[id]`: details, photos, public timeline, comment, cancel while pending.
4. **Tests (E2E):**
   - A tenant reports an issue with a photo and the landlord sees it.
   - The landlord moves it to in progress with an internal note and a public comment; the tenant sees the comment and status but **not the internal note**.
   - The tenant can cancel only while pending.
   - Landlord B and another tenant can't see the request.

### Phase 6 detail (Notices)
Branch `feature/notices`, stacked on `feature/maintenance`.

1. **Migration `…_notices.sql`**
   - Enum `notice_audience` (`all|property|units`).
   - `notices`:
     - Columns: `org_id`, `title` (1–150), `body` (≤5000), `audience`, `property_id` (composite FK), `publish_at` (default now), `expires_at`, `created_by`, timestamps.
     - Checks: `property_id` set ⇔ audience `property`; `expires_at > publish_at`.
   - `notice_units` (`notice_id`, `unit_id`, `org_id`; composite FKs, cascade on notice delete). Rows only for audience `units`.
   - `notice_reads` (`notice_id`, `user_id`) PK + `read_at`.
   - `private.can_see_notice(notice_id)` (definer): published, not expired, and the caller has an **active** tenancy matching the audience. It's evaluated live, so a tenant who moves in later sees current notices with no fan-out rows.
   - RPC `create_notice(p_title, p_body, p_audience, p_property_id, p_unit_ids uuid[], p_publish_at, p_expires_at)` (invoker): notice + units atomically. It validates that the targets belong to the org, and that the units list is non-empty for `units`.
   - View `my_notices` (`security_invoker`): notices + `is_read` for the caller. Tenants only get notices they can see.
   - RLS:
     - Members get full CRUD on notices; `notice_units` is members only.
     - Tenants can select notices where `can_see_notice`.
     - `notice_reads`: tenants can insert and select their own rows for visible notices; members can select reads on their org's notices (for read counts).
   - Activity: `NOTICE_CREATED`.
   - Seed: landlord A has an all-tenants notice, a Green View property notice, a units notice for A1, an expired one and a scheduled one; landlord B has one notice. `tenant.a` has read one.
2. **Landlord UI** (`features/notices/`)
   - `/notices`: list with Scheduled / Live / Expired, audience summary and read count.
   - `/notices/new`: title, body, audience (all / one property / chosen units), publish and expiry.
   - `/notices/[id]`: view, read count, delete. There's no edit; delete and re-create instead.
3. **Tenant UI**
   - `/tenant/notices`: inbox with unread markers.
   - `/tenant/notices/[id]`: opening it marks it read (a client effect calls an action, so link prefetching can't mark notices read).
   - Unread badge on the Notices nav item, rendered in the nav's Suspense boundary.
   - The tenant dashboard shows the unread count.
4. **Tests (E2E):**
   - Targeting: a property notice reaches tenant A; a units notice for a different unit doesn't; expired and scheduled notices are hidden; B's notices are never shown.
   - Opening a notice clears its unread badge.
   - Delete works.
5. **Docs (both phases):** `architecture/database.md`, tick Phases 5 and 6, changelog.

---

## 5. Risks & mitigations
- **Next 16 / Cache Components differences:** auth reads must sit in Suspense boundaries. Read the bundled docs before each auth or data change.
- **Timezone bugs** in overdue and billing months: compute in SQL using `organizations.timezone`. Store `billing_month` as a date.
- **Invite code brute-force:** high-entropy, hashed, expiring, single-use codes with an attempt lockout.
- **Payment correctness:** trigger-maintained totals, an overpayment guard, voids instead of deletes. Each phase is checked manually against seed data.
- **RLS gaps:** unit and DB tests are skipped for now, so the risk here is higher. Mitigations: Playwright cross-account checks, manual checks with the seeded landlord B and tenant B, and `supabase db lint` plus the security advisors before deploy. Adding pgTAP later is recommended.
- **Email deliverability:** Resend needs a verified domain. The default Supabase SMTP is heavily rate-limited, so use Resend SMTP for auth emails in production.
- **Docker** must be installed for local Supabase.
- **Tenants without email or login** get no reminders. The UI shows this clearly ("No email on file").

## 6. Verification (per phase)
- `pnpm typecheck && pnpm lint && pnpm build`
- `pnpm db:reset` (migrations + seed apply cleanly)
- `pnpm test:e2e` (Playwright against local Supabase + seed, at mobile 390px and desktop 1440px viewports)
- Manual check in `pnpm dev` with the seeded landlord, tenant and second landlord accounts. Report results honestly before marking a phase complete.

---

## Changelog
- 2026-10-03: Initial version. The user decided: tenants onboard by invite code, local Supabase via the CLI, in-app + Resend reminders, BDT with an English UI. Unit and DB tests are skipped for now (E2E only).
- 2026-10-03: Phase 1 done (branch `feature/foundation`). Decisions made during implementation:
  - A signup without a valid `role` in its metadata defaults to `tenant`, the least-privileged role.
  - Local email confirmation is off (`supabase/config.toml`) so local signup is instant. It must be **on** in production.
  - Local env vars go in `.env.development.local`, which `next dev` loads ahead of the hosted values in `.env.local`.
  - shadcn components are added with `shadcn@2.3.0`, the last version that targets Tailwind v3.
  - `/tenant/join` (claiming an invite code) is deferred to Phase 3, since it needs the `tenants` table.
- 2026-10-03: Added `.github/workflows/supabase-migrations.yml`, which runs `supabase db push` on merges to `main` that touch `supabase/migrations/` (plus manual runs). This takes over the "push migrations" item from Phase 10. Auth dashboard settings stay manual.
- 2026-10-03: Phase 2 done (branch `feature/property-management`). Decisions made during implementation:
  - `properties.notes` and `units.notes` were added (landlord-only free text). Units get `unique (org_id, id)` now so Phase 3 tables can use composite FKs.
  - A property with units can't be deleted (FK `on delete restrict`); it is archived instead. Archived properties and their units drop out of lists and pickers.
  - `occupied` can't be set by hand: the actions reject changes to or from it. The Phase 3 occupancy trigger owns it.
  - Ids are validated with `z.guid()`, not `z.uuid()`: zod v4's `uuid()` checks RFC 9562 version bits and rejected valid Postgres uuids such as the seed ids.
  - Fixed two Phase 1 latent bugs exposed by the first dynamic routes: the shell navs called `usePathname()` outside `<Suspense>` (blocks prerendering under `cacheComponents`), and Tailwind's `content` didn't scan `features/`.
  - `notFound()` from a page inside the layout's Suspense boundary streams the 404 UI with HTTP 200. Tests assert the rendered 404, not the status. A proper `not-found.tsx` belongs to Phase 9.
  - Next 16 keeps visited routes mounted but hidden, so E2E tests use role queries or `filter({ visible: true })` instead of bare `getByText` counts.
- 2026-10-03: Phase 3 done (branch `feature/tenant-management`). Decisions made during implementation:
  - **Tenant reads go through `my_tenancies()`**, not RLS on base tables, because RLS can't hide landlord-only columns such as `notes` ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)). This replaces the tenant read policies listed in §3. `private.user_tenant_ids()` moves to Phase 4, where it's first needed.
  - Occupancy is an invariant enforced by a `units` trigger (`occupied` ⇔ an active tenancy exists), not just synced. Hand-setting it fails even through the API.
  - Tenants and tenancies have no delete grant. A tenant can move into another unit after moving out; "add tenant" always creates the first tenancy.
  - The invite claim lockout is 10 failures, then 24 hours from the last failure. Codes are Crockford base32 and normalized on entry. The landlord can replace a code at any time; the old one stops working.
  - The tenant portal moved to `app/tenant/(portal)/`. Its layout requires a linked home; unlinked tenants (including new signups) land on `/tenant/join`.
  - Move-out dates can't be in the future (no scheduled move-outs in v1).
  - Fixed a mobile layout bug: in grid layouts, `truncate` text and the chip rows widened the page, which pushed the fixed bottom nav off-screen. List grids now use `grid-cols-1`, and chip rows scroll inside their own box.
  - Database tests stay manual (per the no-unit-tests decision). The occupancy, guard, invite, lockout and isolation rules were exercised in SQL against the seed in a rolled-back transaction; the E2E suite covers the UI flows.
- 2026-10-03: Phase 4 done (branch `feature/rent-management`). Decisions made during implementation:
  - `charges.category` is copied from the charge type by trigger, so the "one rent per tenancy per month" index can be a plain partial unique index. It excludes void charges, so voided rent can be regenerated.
  - Charge **status is derived by a trigger** from `amount_paid`. Users can only set `void`, and only with no live payments. Amounts are fixed once created: void and re-create to correct (no edit UI).
  - Overdue uses `private.org_today(org_id)` (security definer), so tenants, who can't read `organizations`, still get the org-local date.
  - Tenants read their own non-void `charges` and `payments` directly under RLS, as ADR 0007 allows for tables without landlord-only columns. Landlord lists use the `charge_overview` / `payment_overview` views.
  - `generate_monthly_rent` takes `(p_month, p_property_id default null)`; null means all of the caller's active properties, which is what `/rent` uses. It skips tenancies that move in after the month ends and doesn't prorate.
  - The seed is relative to `current_date`, so last month's unpaid charges are always overdue in tests.
  - Rent and bills share one nav item; each page has a Rent / Utility bills switcher.
  - The tenant pages format money with the first tenancy's currency. Fine while landlords use one currency; revisit if a tenant rents from orgs with different currencies.
