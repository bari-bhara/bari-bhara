# 0003 — Product feedback, round 1 (landlord and tenant)

- **Status:** Accepted
- **Date:** 2026-10-24
- **Related ADRs:** [0009](../adr/0009-scheduled-charge-generation-with-pg-cron.md) · [0010](../adr/0010-unit-charge-schedules.md) · [0011](../adr/0011-recoverable-invite-codes.md)
- **Builds on:** [0001](0001-initial-architecture-and-roadmap.md), [0002](0002-ui-refresh.md)

### Progress
- [ ] A. UI quick wins: list menus and row clicks, property/tenant/bill/notice/settings fixes, ID documents, tenant home labels
- [ ] B. Charge schedules: per-unit monthly items, automatic generation, rent changes with notice, metered bills, prepaid meters
- [ ] C. Collection: record payment from Rent & Bills, outstanding page, tenant "Already paid" claims, monthly statements
- [ ] D. Invite codes visible until used or expired

> Living document: tick a phase when it lands and record decisions under "Changelog".

## Context
The team reviewed the app as a landlord and as a tenant and sent feedback in three parts (landlord account, tenant account, broader items) plus open questions. This plan turns it into four phases, each shippable on its own.

Decisions made with the user:
- **Automatic rent:** each month's rent and fixed bills are created on the **1st**, in the organization's time zone, by `pg_cron` inside Supabase. The Generate button stays as a fallback ([ADR 0009](../adr/0009-scheduled-charge-generation-with-pg-cron.md)).
- **Breakdown model:** each **unit** has dated monthly items (rent, service charge, flat-rate water…), so raises take effect from a chosen month. Metered bills are entered monthly, optionally from meter readings × rate. Landlord and tenant see a monthly statement ([ADR 0010](../adr/0010-unit-charge-schedules.md)).
- **C1:** the invite code stays visible until it's used or expires ([ADR 0011](../adr/0011-recoverable-invite-codes.md)).
- **Payment claims:** the landlord hears about a tenant's "Already paid" claim **in the app and by email**.
- **1.4.1 (Add Unit fields: rooms, dropdowns for floor/type/bedrooms): deferred.** The user has a different idea and will specify it separately.

## Answers to the open questions

**Q1. Why is Generate Rent manual?** The first build avoided background jobs on purpose. [ADR 0001](../adr/0001-supabase-as-backend.md) keeps the app free of a service-role key, and [ADR 0004](../adr/0004-unified-charges-table-and-derived-overdue.md) derives "overdue" so nothing depended on a scheduler. The intended journey was: at the start of the month the landlord opens Rent & Bills and presses **Generate rent for <month>** once (it's idempotent), then records payments as they come in. Phase B replaces that with `pg_cron`, which runs inside the database and still needs no service key.

**Q2. Why do both the landlord and the tenant enter tenant information?** They don't enter the same thing. The landlord owns the **tenant record** (name, phone, email, notes, tenancy terms), and tenants can exist without ever using the app ([ADR 0002](../adr/0002-tenant-onboarding-via-invite-code.md)). A tenant who wants the app creates a **login** (their name and email for signing in) and enters the landlord's invite code, which links that login to the landlord's record. The tenant's signup name is never copied over, so the landlord's record stays the source of truth for billing and reminders.

**C1. Is "always displays the invite code with an expiry date" a bug?** It was deliberate: only a hash of each code was stored, so after the first dialog the page could show only "a code is active until <date>". At the team's request, Phase D keeps the code itself visible until it's used or expires.

## Phase A — UI quick wins
Migration `…_feedback_ui.sql`.

1. **Lists (1.2).** `components/app/row-actions.tsx` (a "⋯" menu of links or callbacks) and `components/app/clickable-row.tsx` (a desktop row that opens on click anywhere, ignoring clicks on links, buttons and anything portaled out of the row). Applied to properties (list view), units, tenants, rent and bills, payments and notices. Maintenance keeps its card list without a menu: its only action is opening the request.
2. **Properties (1.3).** Grid/list toggle (`?view=list`). Address and city are required; the address placeholder is "e.g. House, Road, Area". Rent due day is a searchable dropdown (1st–28th), using a new `Combobox` (`cmdk` + Radix Popover).
3. **Units (1.4.1).** Deferred (see above).
4. **Tenants (1.5).** Phone is required. The tenant list shows email under the phone number. The unit picker has a property filter (default "All properties"). **ID documents:** `tenant_documents` + private bucket `tenant-documents` (JPEG/PNG/WebP/PDF, 5 MB, 10 per tenant), members only; tenants can't read them. Upload while adding a tenant or later from their page; signed links; delete.
5. **Bills (1.6).** "For month" can't be before the tenancy's move-in month: the form sets `min` and moves the month forward when the tenant changes, the action checks it, and `prepare_charge` rejects it (`BB015`).
6. **Notices (1.8).** Scheduled notices can be edited (`update_notice()`, plus an update policy limited to `publish_at > now()`). Published notices stay read-only so read receipts keep meaning.
7. **Settings (1.9).** Edit dialogs for account (name, phone) and business (name; owner only by RLS).
8. **Tenant pages (2.2).** Payments, maintenance, notices and reminders show "Property · Unit". `my_tenancies()` gains `property_id` and `org_id`; `my_notices` gains `property_id`.

## Phase B — Charge schedules
Migration `…_charge_schedules.sql`. See [ADR 0009](../adr/0009-scheduled-charge-generation-with-pg-cron.md) and [ADR 0010](../adr/0010-unit-charge-schedules.md).

1. `unit_charge_items` (dated monthly amounts per unit and type), filled from each tenancy's rent at move-in; existing tenancies backfilled.
2. `create_scheduled_charges()` / `generate_monthly_charges()`; `generate_monthly_rent()` becomes a wrapper. The scheduler skips types already billed (voided included); the button re-creates voided ones.
3. `pg_cron` job `bari-bhara-charge-schedule` (hourly) → `private.run_charge_schedule()`.
4. **Rent change (1.4.2):** "Change rent" and "Add a monthly bill" on the unit page (and Change rent on Edit unit), from next month or later (`BB019`). The tenant is notified in the app and by email (`charge_change`).
5. **Metered bills:** optional previous/current reading and rate on a bill; the amount is computed from them; the previous reading is prefilled.
6. **Prepaid meters (3.6):** electricity account and meter numbers and gas meter number on the unit; tenants see them on their dashboard.
7. New system bill type "Service charge".

## Phase C — Collection
1. **Record payment from Rent & Bills (3.3):** a row-menu action opening the existing dialog (landed with Phase A's row menus).
2. **Outstanding (3.4):** `/outstanding` lists every open charge grouped by tenant, overdue first, with totals; linked from the dashboard.
3. **Payment claims (2.1):** tenants press **Already paid** on a charge they owe; the landlord approves (records the payment) or rejects with a note. In-app badge and dashboard card for the landlord, plus an email; the tenant is told the outcome.
4. **Statements (2.3, 3.5):** a month-by-month breakdown of charges and the payments applied to each, on the tenant's Payments page and the landlord's tenant page.

## Phase D — Invite codes
See [ADR 0011](../adr/0011-recoverable-invite-codes.md).

## Verification
- `pnpm typecheck && pnpm lint && pnpm build`, `pnpm db:reset`, `pnpm db:lint`.
- `pnpm test:e2e`: the existing suite plus `e2e/feedback.spec.ts` (Phase A), `e2e/schedules.spec.ts` (Phase B), `e2e/collections.spec.ts` (Phase C) and invite tests (Phase D).

## Changelog
- 2026-10-24: Plan written from the team's feedback. The user chose: generation on the 1st via pg_cron, per-unit dated items, invite codes visible until used or expired, claim alerts in-app and by email. Item 1.4.1 is deferred at the user's request.
