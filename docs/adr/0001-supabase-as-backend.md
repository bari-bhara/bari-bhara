# 0001 — Supabase as the only backend

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
Bari_bhara needs a database, authentication, file storage and strict per-landlord data isolation. The team is small, and the frontend is Next.js 16 on Vercel.

## Decision
We will use Supabase (Postgres, Auth, Storage, RLS) as the only backend, with no separate API server.
- Reads happen in Server Components and writes in Server Actions. Both use `@supabase/ssr` with the user's JWT and the **publishable key** only.
- Multi-row or privileged operations (rent generation, invite claiming) are Postgres functions (RPCs).
- **Authorization lives in Row Level Security.** `proxy.ts` and route layouts only perform optimistic redirects for UX.
- No service-role key is used by the app.
- Server-only secrets are limited to the email provider (`RESEND_API_KEY`, `EMAIL_FROM`).

## Alternatives considered
- **Separate Node/NestJS API + ORM:** more moving parts, and authorization would be duplicated outside the database.
- **Next.js route handlers with the service-role key:** this bypasses RLS, so one missed check leaks data.

## Consequences
- Business rules that must be reliable (payment status, occupancy) live in SQL triggers and functions, so the team must be comfortable writing SQL.
- Every schema change goes through a migration (see [ADR 0006](0006-local-supabase-cli-workflow.md)).
- Vendor coupling to Supabase is moderate. The data is plain Postgres and can be migrated.
