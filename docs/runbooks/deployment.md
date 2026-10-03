# Deployment runbook

- **Status:** Living. Update it whenever a hosted setting or release step changes.
- **Date:** 2026-10-03
- **Related:** [Plan 0001, Phase 10](../plans/0001-initial-architecture-and-roadmap.md) · [ADR 0005](../adr/0005-notifications-provider-interface-resend.md) (email) · [ADR 0006](../adr/0006-local-supabase-cli-workflow.md) (migrations) · [Security](../architecture/security.md)

Bari_bhara runs on:

| Piece | Service | Configured in |
|---|---|---|
| Next.js app | Vercel | Vercel project settings and env vars |
| Database, Auth, Storage | Supabase (hosted) | Migrations (GitHub Actions) plus dashboard settings |
| Email: auth emails and reminders | Resend | Resend dashboard, Supabase SMTP settings, Vercel env vars |
| Migrations | GitHub Actions ([`supabase-migrations.yml`](../../.github/workflows/supabase-migrations.yml)) | Repository secrets and variables |

Every step below changes a live system. Do them in order the first time, and tick them off.

## One-time setup

### 1. Resend (do this first: Supabase SMTP and reminders both need it)
- [ ] Add the sending domain (e.g. `baribhara.example.com`) and add the DNS records Resend shows (SPF, DKIM; DMARC recommended). Wait until it shows **Verified**.
- [ ] Create two API keys with **Sending access** only, restricted to that domain:
  - one for Supabase Auth SMTP;
  - one for the app's reminder emails (`RESEND_API_KEY`).

  Separate keys can be revoked independently.

### 2. Supabase project
Dashboard paths are as of 2026; names may shift slightly.

- [ ] **Authentication → URL Configuration**
  - Site URL: `https://<production domain>`
  - Redirect URLs: `https://<production domain>/**`. Add preview URLs only if previews should be able to sign in (see the note on previews in step 4).
- [ ] **Authentication → Sign In / Providers → Email**
  - **Confirm email: on.** It's off only in local development (`supabase/config.toml`).
  - Secure email change: on.
  - Minimum password length: **8**. This matches the app; the Auth API is reachable directly with the publishable key.
  - Leaked password protection: on, if your plan includes it.
- [ ] **Authentication → Hooks → Customize Access Token (JWT) Claims:** enable it, type *Postgres*, schema `private`, function `custom_access_token_hook`. The migration already grants it to `supabase_auth_admin`. Without it, sign-in still works, but the proxy can't redirect by role.
- [ ] **Authentication → SMTP Settings:** enable custom SMTP.
  - Host `smtp.resend.com`, port `465`, username `resend`, password = the Auth SMTP key from step 1.
  - Sender: an address on the verified domain (e.g. `no-reply@…`), name "Bari_bhara".
- [ ] **Authentication → Rate Limits:** once custom SMTP is on, raise "emails sent per hour" from the built-in-SMTP default to suit expected signups.
- [ ] **Project Settings → API:** exposed schemas stay `public` and `graphql_public` (the default). Never expose `private`.
- [ ] Note the **project ref**, **database password**, **project URL** and **publishable key** for the next steps.

### 3. GitHub (migrations)
- [ ] Create a personal access token at supabase.com → Account → Access Tokens.
- [ ] Settings → Environments: create `production`. Optionally add required reviewers, so each migration run waits for approval.
- [ ] Settings → Secrets and variables → Actions:
  - Secret `SUPABASE_ACCESS_TOKEN`
  - Secret `SUPABASE_DB_PASSWORD`
  - Variable `SUPABASE_PROJECT_ID` (the project ref)
- [ ] Run **Actions → Supabase migrations → Run workflow** once. The dry-run step lists what it will apply. Afterwards, check that the database tables exist and that Storage has a private `maintenance-photos` bucket.

### 4. Vercel
- [ ] Import the GitHub repository (framework Next.js; default build command; Node 20 or later).
- [ ] Environment variables for **Production**:

  | Name | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
  | `NEXT_PUBLIC_SITE_URL` | `https://<production domain>`, used in auth email links |
  | `RESEND_API_KEY` | The reminders key from step 1 |
  | `EMAIL_FROM` | e.g. `Bari_bhara <reminders@baribhara.example.com>`, on the verified domain. Required with `RESEND_API_KEY`. |

  - Never set `MAILPIT_URL` here; it's for local development only.
  - **Never** add a Supabase service-role or secret key: the app doesn't use one.
  - `NEXT_PUBLIC_*` values are built into the client bundle, so **redeploy after changing them**.
- [ ] **Preview deployments:** don't point them at the production database. Either leave Preview env vars unset (previews build but can't sign in), or create a separate staging Supabase project for them.
- [ ] Add the custom domain, and make sure it matches the Site URL from step 2.

## Releasing

Merging to `main` triggers two things in parallel: the migration workflow (only when `supabase/migrations/` changed) and a Vercel production deployment.

1. **Merge in order.** The first release goes through the stacked branches in this order:
   1. `feature/rent-management`
   2. `feature/maintenance`
   3. `feature/notices`
   4. `feature/dashboards`
   5. `feature/notifications`
   6. `feature/polish`
   7. `feature/deployment`

   Each one's migration must apply before the next.
2. **Watch Actions → Supabase migrations** until it's green. A failed migration leaves the database at the previous version. Fix it with a new commit; don't edit an applied migration.
3. **Wait for the Vercel deployment** to be Ready.
   - New code can go live a minute before its migration finishes. That's harmless while there are no users.
   - Once there are users, prefer migrations that old code tolerates (additive first; remove things in a later release).
4. **Smoke test** against the live URL:

   ```sh
   SMOKE_BASE_URL=https://<production domain> pnpm test:smoke
   ```

   - This is read-only: public pages, security headers, signed-out redirects and auth errors.
   - To also check sign-in, create a dedicated landlord account and a tenant account in production (e.g. `smoke+landlord@…`), then add `SMOKE_LANDLORD_EMAIL`, `SMOKE_LANDLORD_PASSWORD`, `SMOKE_TENANT_EMAIL` and `SMOKE_TENANT_PASSWORD`.
5. **First release only:** check email end to end.
   - Sign up a new landlord: the confirmation email arrives from your domain, and its link lands back in the app signed in.
   - Request a password reset: the email arrives and the link works.
   - As the smoke landlord, send a reminder to a test tenant with an email address: the charge page shows it as **sent**, and the email arrives.
6. Tick Phase 10 in the plan after the first successful production smoke test.

## Rollback

- **App:** Vercel → Deployments → choose the previous deployment → **Instant Rollback**.
- **Database:** migrations are forward-only. Fix problems with a new migration. For a risky migration, take a backup first (Database → Backups; point-in-time recovery depends on the plan).
- **Email:** revoke the Resend key to stop reminders at once. Rows are then recorded as failed, with the error.

## Never

- Never run `supabase/seed.sql` against production. `db push` doesn't run it; keep it that way. Seed accounts have a known password.
- Never commit `.env*` files with real values. `.env.local` is git-ignored.
- Never edit a migration that has been applied to production.
