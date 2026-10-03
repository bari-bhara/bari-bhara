# Security

- **Status:** Living reference. Keep it in sync with the code, migrations and hosted settings.
- **Last reviewed:** 2026-10-03 (Phase 10, against migrations up to `20261003120000_notifications.sql`)
- **Related:** [ADR 0003](../adr/0003-org-based-multi-tenancy-and-rls.md) (multi-tenancy and RLS) · [ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md) (tenant reads) · [database.md](database.md) · [deployment runbook](../runbooks/deployment.md)

This page covers how Bari_bhara keeps each landlord's data private, and what the 2026-10-03 review checked. Re-run the checks in [How to re-check](#how-to-re-check) after any migration that adds a table, view or function.

## Model

- **Who:**
  - Landlords belong to an organization. Every landlord row (property, unit, tenant, charge and so on) carries `org_id`.
  - Tenants are linked to a tenant record by invite code ([ADR 0002](../adr/0002-tenant-onboarding-via-invite-code.md)).
- **Where it's enforced:**
  - **The database is the boundary.** Every API request runs as the signed-in user, under Row Level Security. The app holds no service-role key, so no code path bypasses RLS.
  - The Next.js proxy and DAL redirects are for usability, not security.
- **Roles:**
  - `profiles.role` (`landlord` | `tenant`) is set at signup. A signup without a valid role becomes `tenant`.
  - Users can't change their own role: `profiles` grants update on `full_name` and `phone` only.
  - The access-token hook copies the role into the JWT (`app_metadata.user_role`) for the proxy's redirects. Server code re-reads the role from `profiles` (`lib/dal.ts`).

## Database (checked 2026-10-03)

| Check | Result |
|---|---|
| RLS enabled on every `public` table | ✅ All 19 tables |
| `anon` privileges on `public` tables and views | ✅ None |
| Views run as the caller (`security_invoker = true`) | ✅ All 8 views |
| `security definer` functions pin `search_path = ''` | ✅ All 35 |
| `security definer` functions executable by `anon` | ✅ None |
| Definer functions executable by `authenticated` | 17, each scoped to the caller: membership helpers (`user_org_ids()` and others), tenant RPCs that check the caller's own tenancy (`my_tenancies`, `claim_tenant_invite`, `create_maintenance_request`, `cancel_maintenance_request`, `mark_notifications_read`), and landlord helpers that check membership (`create_tenant_invite`, `log_rent_generated`). `org_today(org_id)` returns only a date. |
| Trigger functions | Not executable by `authenticated` |
| Access-token hook | Executable only by `supabase_auth_admin` |
| Exposed API schemas | `public` and `graphql_public` only. The `private` schema (helpers, invite attempt counts) isn't reachable over the API. |
| Storage | One bucket, `maintenance-photos`: private, 5 MB, JPEG/PNG/WebP only. Read and upload policies are scoped to the request's org and its tenant, and a trigger checks that each registered path exists and belongs to the request. |
| `supabase db lint` and `supabase db advisors --type all` | ✅ No issues |

Rules enforced in the database rather than the app:
- **Cross-org references are impossible:** child tables use composite foreign keys `(org_id, id)`.
- **Column-level grants** keep server-maintained columns (totals, statuses, recipients, `org_id` on children) out of reach of client writes. Triggers fill them in.
- **Tenants never see landlord-only columns** (notes): they read through definer functions that return safe columns ([ADR 0007](../adr/0007-tenant-reads-through-safe-functions.md)). Internal maintenance notes are hidden by row-level policy.
- **Payments can't exceed the charge** and are voided, never deleted. Charge status is derived by trigger.
- **Reminder recipients** are filled from the tenant record by trigger, so a landlord can't address a user or email address outside their tenants.
- **Invite codes:** high-entropy, hashed, expiring and single-use, with a lockout after 10 failed claims (24 hours).

## Application (checked 2026-10-03)

| Check | Result |
|---|---|
| Server Actions authorize before data access | ✅ Every action calls `requireRole()` or `verifySession()` (the auth actions are public by design), validates input with zod, then queries as the user (RLS) |
| Secrets in the browser | ✅ Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key. `RESEND_API_KEY` is read only in `server-only` modules. |
| Service-role key | ✅ Not used anywhere |
| Open redirects | ✅ `?next=` accepts same-origin relative paths only (`safeNextPath`) |
| XSS | ✅ React escapes output. No `dangerouslySetInnerHTML`. Email HTML escapes every interpolated value. |
| Security headers | ✅ `next.config.ts`: a CSP with `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` and `object-src 'none'`, plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS. No `X-Powered-By`. |
| Dependency audit (`pnpm audit --prod`) | ✅ No known vulnerabilities |
| Not-found responses | A record from another org shows the same "Page not found" as a missing one. Signed-out visitors to any unknown URL go to login first, so which URLs exist isn't revealed. |

## Hosted settings that matter

These live in the Supabase dashboard, not in the repo. The [runbook](../runbooks/deployment.md) has the steps.

- **Email confirmation on.** It's off locally for fast tests.
- **Minimum password length 8.** The app enforces 8, but the Auth API can be called directly with the publishable key.
- **Site URL and redirect URLs** limited to the production domain (and preview URLs, if used).
- **Access-token hook enabled.** Without it the proxy can't redirect by role. Pages still render correctly, because the DAL reads the role from `profiles`.
- **Custom SMTP (Resend)** for auth emails. The built-in sender is heavily rate-limited.
- **Leaked-password protection**, if the plan includes it.

## Known gaps and recommendations

- **No script CSP.**
  - Why: a nonce-based `script-src` makes every page dynamic under Cache Components, which loses the static shells.
  - Mitigated by: React escaping, no raw HTML, and the framing and form-action limits.
  - Revisit if the app ever renders user-supplied HTML.
- **Database rules are verified manually and by E2E, not by pgTAP** (the current no-unit-tests decision). Cross-account E2E tests cover the main isolation paths. Adding pgTAP tests for RLS is the highest-value next step.
- **No cooldown on a single "Send reminder".** Bulk reminders skip tenants reminded in the last 20 hours, but a landlord can send one charge's reminder repeatedly to their own tenant. Consider a short per-charge cooldown.
- **No app-level rate limiting** beyond Supabase Auth's limits and the invite lockout. Fine at current scale; add it for any public endpoint that sends email or SMS.
- **No MFA, no photo deletion, no account deletion flow.** These are product features, not regressions.
- **Activity log is not tamper-evident.** It's written by definer triggers, and users can't insert into it directly. Treat it as an audit aid, not evidence.

## How to re-check

Against the local stack (`pnpm db:start`), run:

```sql
-- Tables without RLS (expect none)
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- Anything granted to anon (expect none)
select table_name, privilege_type from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';

-- Definer functions: search_path pinned, anon can't run them (expect no rows)
select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname in ('public', 'private')
  and (p.proconfig is null or has_function_privilege('anon', p.oid, 'execute'));

-- Views that don't run as the caller (expect none)
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
  and not coalesce(c.reloptions @> array['security_invoker=true'], false);
```

Then run `pnpm db:lint` (lint plus advisors) and `pnpm audit --prod`.
