# 0005 — Notification provider interface, in-app + Resend

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
Landlords send payment reminders. Planned future channels are SMS, WhatsApp and push. The app must not be tightly coupled to one provider, and every reminder must be traceable.

## Decision
- A **`notifications`** table records one row per delivery attempt: recipient tenant/user, `type`, `channel` (`in_app|email|sms|whatsapp`), related `charge_id`, subject, message, `status` (`pending|sent|failed`), `sent_at`, `read_at`, `error`.
- `lib/notifications/` defines a `NotificationProvider` interface (`send(notification) → result`). v1 has two providers:
  - **InAppProvider:** marks the row as sent, and the tenant portal lists it.
  - **ResendEmailProvider:** server-only, uses `RESEND_API_KEY` and `EMAIL_FROM`.
- Server Actions create the rows, dispatch them to providers, and record the outcome.

## Alternatives considered
- **In-app only:** simpler, but landlords need tenants to actually receive reminders.
- **Supabase Edge Function + queue:** better for high volume, but unnecessary for v1. The interface allows moving to it later.

## Consequences
- Resend needs a verified sending domain in production.
- Tenants without an email address get in-app reminders only (or none, if they have no login), and the UI says so.
- Adding SMS or WhatsApp means writing a new provider and a channel value, with no schema change.
