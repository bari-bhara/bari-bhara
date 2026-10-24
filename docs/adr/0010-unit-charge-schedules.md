# 0010 — Dated monthly charge schedules per unit

- **Status:** Accepted
- **Date:** 2026-10-24

## Context
Landlords raise or lower rent over time, and many charge fixed monthly bills (service charge, flat-rate water) alongside rent. Other bills are metered and change every month. [ADR 0004](0004-unified-charges-table-and-derived-overdue.md) keeps every bill in `charges`, but nothing recorded what a unit *should* be billed each month, so a raise had to be remembered and every fixed bill entered by hand.

## Decision
- A unit's monthly items live in **`unit_charge_items`**: `(unit_id, charge_type_id, amount, effective_month)`. The amount billed for a type in a month is the row with the latest `effective_month` on or before it. An amount of 0 ends the item. Rows form a dated history, so a raise never rewrites past months.
- **Rent is one of these items.** When a tenancy starts, its `monthly_rent` becomes the unit's rent from the move-in month, and rent changes planned after that (for the previous tenant) are dropped. `tenancies.monthly_rent` stays as the rent currently in force (kept in sync by the scheduler, [ADR 0009](0009-scheduled-charge-generation-with-pg-cron.md)).
- Changes are made through `set_unit_charge_item()`, which only accepts a **month that hasn't started yet** in the organization's time zone, so issued charges and the current month are never affected. The tenant is notified in the app and by email (`notification_type` `charge_change`).
- Generation (`create_scheduled_charges`, used by the scheduler and the Generate button) creates one charge per scheduled item per active tenancy, with the property's due day.
- **Metered bills** stay manual, one charge per month. A bill can record `meter_previous`, `meter_current` and `unit_rate`; the amount is computed from them. The previous reading is prefilled from the last bill of that type.
- The **monthly statement** (landlord and tenant) groups a tenancy's charges by billing month with the payments applied to each. It is a read model over `charge_balances` and `payments`, not a new table.

## Alternatives considered
- **Line items inside a single monthly invoice:** a cleaner statement, but it would replace the charge-level payment model of ADR 0004 and every rent and bills page.
- **Templates on the tenancy instead of the unit:** the user asked for per-unit items; unit items also outlive tenants (a building's service charge doesn't change when the tenant does).
- **Edit `tenancies.monthly_rent` in place:** loses the date a change applies from, so a raise would hit the current month or need someone to remember to make it on the 1st.

## Consequences
- Rent shown on lists is the rent in force; the unit page shows upcoming changes.
- Existing active tenancies were backfilled with a rent item from their move-in month.
- Prorating a mid-month move-in is still out of scope.
