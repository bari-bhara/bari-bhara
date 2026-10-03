# 0004 — Unified charges table, derived overdue status

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
Rent and utility bills (electricity, gas, water, internet, …) both have an amount, a due date, partial payments and a status. The requirements say payment status must come from reliable database records, not UI state, and that new bill types must be easy to add.

## Decision
- A single **`charges`** table holds rent and utility bills. Its type comes from **`charge_types`** (system defaults plus per-org custom types, with category `rent|utility`). The UI still shows `/rent` and `/bills` separately by filtering on category.
- **`payments`** reference one charge each. Partial payments are multiple rows. An after insert/update trigger recomputes `charges.amount_paid` and `status` (`unpaid|partially_paid|paid|void`) and rejects overpayment. Corrections are made by **voiding** a payment, never deleting it.
- **Overdue is derived, not stored.** The view `charge_balances` (`security_invoker = true`) computes `outstanding` and `effective_status`, which is `overdue` when the charge is unpaid or partially paid and the due date is before today in the organization's timezone.
- Monthly rent comes from the `generate_monthly_rent(property, month)` RPC. It is idempotent through a unique index on `(tenancy_id, billing_month)` for rent.

## Alternatives considered
- **Separate `rent_charges` and `utility_bills` tables:** duplicate logic, polymorphic payment FKs, and two queries for every balance.
- **Stored `overdue` status updated by pg_cron:** it can drift if the job fails, and it adds infrastructure.

## Consequences
- Every balance and dashboard query reads `charge_balances`.
- Billing months and "today" depend on timezone, so they are computed in SQL from `organizations.timezone` (default `Asia/Dhaka`).
- Online payments (Stripe, bKash) can later insert into `payments` through the same trigger path.
