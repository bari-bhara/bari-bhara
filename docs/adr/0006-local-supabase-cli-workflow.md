# 0006 — Local Supabase CLI workflow

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
Schema changes must be reproducible, and the production database must never be edited by hand. Developers need a throwaway database with seed data.

## Decision
- The Supabase CLI is a dev dependency, run through pnpm scripts. `supabase start` runs a full local stack in Docker.
- All schema, RLS, function, trigger and storage-policy changes are SQL migrations in `supabase/migrations/`. `pnpm db:reset` replays the migrations and `supabase/seed.sql`, which contains fake data only.
- TypeScript types are generated from the local DB (`pnpm db:types` → `lib/supabase/database.types.ts`) and committed.
- Deployment is `supabase link` + `supabase db push` to the hosted project. Production is never changed outside migrations.
- **pnpm** is the package manager, and `package-lock.json` is removed.

## Alternatives considered
- **Hosted project only:** no Docker is required, but there is no safe place to experiment or reset.

## Consequences
- Docker is required for development.
- `.env.local` points at the local stack during development. The hosted values go in Vercel environment variables.
