<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project docs

All plans, architecture decisions and reference docs live in [`docs/`](docs/README.md).

- Before starting work, read [`docs/README.md`](docs/README.md), the active plan in `docs/plans/`, and any ADRs in `docs/adr/` that relate to the area you're changing.
- Follow accepted ADRs. To change a decision, add a new ADR that supersedes the old one; don't edit the old one.
- When work lands, tick its progress box in the plan and add a changelog line when the plan changes.
- When you add a migration, update `docs/architecture/database.md`.
- Add every new doc to the index in `docs/README.md`.
