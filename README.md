# Bari_bhara

Rental and property management for landlords and tenants: properties, flats, tenants, rent, utility bills, payments, maintenance and notices.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS + shadcn/ui · Supabase (Postgres, Auth, RLS, Storage) · Playwright · Vercel

Plans, architecture decisions and the database reference live in [`docs/`](docs/README.md). Start there.

## Prerequisites

- Node.js 20+
- pnpm
- Docker (for the local Supabase stack)

## Local development

```bash
pnpm install
pnpm db:start          # starts local Supabase; prints the API URL and publishable key
```

Create `.env.development.local` from what `db:start` printed (see [`.env.example`](.env.example)):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from db:start>
```

```bash
pnpm db:reset          # applies migrations + seed data
pnpm dev               # http://localhost:3000
```

### Seed accounts (local only)

All seed accounts use the password `Password123!`.

| Email | Role |
|---|---|
| `landlord.a@example.com` | Landlord (Green View Properties) |
| `landlord.b@example.com` | Landlord (Lakeside Homes) |
| `tenant.a@example.com` | Tenant |
| `tenant.b@example.com` | Tenant |

Other local services: Supabase Studio at http://127.0.0.1:54323 and Mailpit (captured emails) at http://127.0.0.1:54324.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` | ESLint / TypeScript |
| `pnpm db:start` / `db:stop` | Start or stop local Supabase |
| `pnpm db:reset` | Recreate the local DB from migrations + `supabase/seed.sql` |
| `pnpm db:lint` | Schema lint + security/performance advisors |
| `pnpm db:types` | Regenerate `lib/supabase/database.types.ts` |
| `pnpm test:e2e` | Playwright tests (mobile 390px + desktop 1440px) against local Supabase |

## Database changes

1. `pnpm exec supabase migration new <name>` and write the SQL.
2. `pnpm db:reset && pnpm db:lint && pnpm db:types`
3. Update [`docs/architecture/database.md`](docs/architecture/database.md).

Never change the hosted database outside migrations. See [ADR 0006](docs/adr/0006-local-supabase-cli-workflow.md).

### Deploying migrations

[`.github/workflows/supabase-migrations.yml`](.github/workflows/supabase-migrations.yml) runs `supabase db push` against production when files under `supabase/migrations/` are merged to `main`. You can also run it manually from the Actions tab. Seed data is never pushed. It needs these repository settings (Settings → Secrets and variables → Actions):

| Name | Kind | Value |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Secret | Personal access token from supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | Secret | Production database password |
| `SUPABASE_PROJECT_ID` | Variable | Project ref (the subdomain of the project URL) |

Auth settings (Site URL, redirect URLs, the custom access token hook, SMTP) are configured in the Supabase dashboard, not by this workflow.

## Project structure

```
app/               routes: (auth), (landlord), tenant/, auth/confirm
components/ui/     shadcn primitives
components/app/    app shell, navigation, shared page components
features/<domain>/ actions, schemas, components per domain
lib/               supabase clients, DAL, routing rules, helpers
supabase/          config, migrations, seed
e2e/               Playwright specs
docs/              plans, ADRs, architecture reference
```
