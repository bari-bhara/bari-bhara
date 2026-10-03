# Bari_bhara Documentation

This folder is the single source of truth for how Bari_bhara is planned, designed and built. Humans and AI agents read it before making changes, and update it when changes affect what it describes.

## Layout

| Folder | What goes here | Lifecycle |
|---|---|---|
| [`plans/`](plans/) | Implementation plans and roadmaps: scope, phases, verification | **Living.** Update the progress checkboxes and changelog as work lands |
| [`adr/`](adr/) | Architecture Decision Records: one significant decision per file | **Immutable once Accepted.** To change a decision, write a new ADR and mark the old one `Superseded by NNNN` |
| [`architecture/`](architecture/) | Current-state reference docs (database, auth flow, etc.) | **Living.** Keep in sync with the code and migrations |

## Index

### Plans
- [0001 — Initial architecture & roadmap](plans/0001-initial-architecture-and-roadmap.md) (Accepted)

### Architecture Decision Records
- [0001 — Supabase as the only backend](adr/0001-supabase-as-backend.md) (Accepted)
- [0002 — Tenant onboarding via invite code](adr/0002-tenant-onboarding-via-invite-code.md) (Accepted)
- [0003 — Organization-based multi-tenancy enforced by RLS](adr/0003-org-based-multi-tenancy-and-rls.md) (Accepted)
- [0004 — Unified charges table, derived overdue status](adr/0004-unified-charges-table-and-derived-overdue.md) (Accepted)
- [0005 — Notification provider interface, in-app + Resend](adr/0005-notifications-provider-interface-resend.md) (Accepted)
- [0006 — Local Supabase CLI workflow](adr/0006-local-supabase-cli-workflow.md) (Accepted)
- [0007 — Tenants read their data through column-safe functions](adr/0007-tenant-reads-through-safe-functions.md) (Accepted)

### Architecture reference
- [Database](architecture/database.md)

## Conventions

- **Naming:** `NNNN-kebab-case-title.md`, numbered sequentially within each folder and never reused.
- **Header:** every plan and ADR starts with `Status` (Proposed · Accepted · Superseded by NNNN · Deprecated) and `Date` (YYYY-MM-DD).
- **New ADR:** copy [`adr/0000-template.md`](adr/0000-template.md). Write one when a decision is hard to reverse or shapes many files, e.g. a new external service, a schema pattern, an auth or security model, or a change of library.
- **New plan:** write one for each multi-step feature or phase that isn't already covered by an existing plan.
- **Links:** use relative links to code (e.g. `../../lib/supabase/server.ts`) so they work on GitHub.
- **Keep the index current:** add every new doc to the index above in the same commit.
- **Commits:** use the `docs:` prefix for documentation-only commits.
