# 0002 — UI refresh: modern, friendlier, token-driven

- **Status:** Accepted
- **Date:** 2026-10-11
- **Related ADRs:** [0008](../adr/0008-design-tokens-and-visual-language.md)
- **Builds on:** [0001](0001-initial-architecture-and-roadmap.md) (Phase 9 a11y and layout guarantees stay in force)

### Progress
- [x] 1. Docs (this plan, ADR 0008)
- [x] 2. Tokens, type and primitives
- [x] 3. Shared app components and shell
- [x] 4. Feature badges and hard-coded colours
- [x] 5. Landing, auth and status pages
- [x] 6. Dashboards
- [x] 7. Verification

> Living document: tick boxes as work lands, record changes under "Changelog".

## Context
The user asked to make the whole UI "a bit modern and user friendly", shared a reference design, and asked to keep the system modular. Work happens on branch **`feature/ui-refresh`** from `main`, with small commits per step, as in plan 0001.

The reference: a dark olive-black canvas; one light lime accent; very large, wide, light-weight headings; pill-shaped controls; hairline borders; thin concentric "orbit" rings; small status dots next to labels; a calm amount of text.

This is a visual refresh, not a redesign of flows: routes, page structure, copy and data loading stay as they are, so the E2E suite keeps passing unchanged.

## Design plan

### Colour (ADR 0008 tokens; hex values are approximate)
| Role | Dark | Light |
|---|---|---|
| Canvas (page backdrop) | `#0E100C` olive black | `#EEF1E9` sage paper |
| Surface (panels, cards) | `#151813` | `#FCFDFA` |
| Ink (foreground) | `#EBEFE3` | `#151A10` |
| Muted ink | `#9EA595` | `#56604D` |
| Primary | lime `#D0EA86` on moss text | moss `#2F3D1E` with lime text |
| Brand mark | lime `#D0EA86` | lime `#D0EA86` (on moss or as a fill only) |

Status tones: success (leaf green), warning (amber), info (sky), highlight (violet, used for "scheduled"), destructive (coral in dark, red-700 in light). Every tone is tuned to pass AA as text on its surface.

### Type
- **Archivo** variable (`wght` 100–900, `wdth` 62–125) through `next/font`; it replaces Geist.
- `font-display` = Archivo at `wdth` 125 (expanded), weight 300–400, slight negative tracking. Used for page titles, dashboard figures and the landing headline.
- Body at normal width, 14–16px. Headings stay sentence case; no all-caps labels, no tracked-out eyebrows.
- Scale: 12 / 14 / 16 / 20 / 28 / 36 / 56–88 (landing only).

### Layout and shape
- The shell keeps its structure (sidebar ≥ md, bottom tabs on phones), restyled:
  - **The sidebar is always dark moss**, in both themes (a `.dark` token scope on the aside): it carries the identity of the reference. The active item is a soft pill with a lime dot.
  - The **top bar** is translucent with a backdrop blur and a hairline border.
  - The **mobile tab bar** floats as an inset rounded bar above the safe area.
- Panels are 16px radius, hairline border, no shadow. Buttons, chips, badges and pagination are pills. Inputs are 12px radius and slightly taller.
- Content is left-aligned, max width unchanged (`max-w-6xl`).
- Lists keep the table (≥ md) / card list (phones) split.

```
┌ sidebar (moss) ┐┌ top bar (blur) ───────────────────── theme · avatar ┐
│ ◎ Bari Bhara   ││                                                     │
│                ││  Welcome, Rahim              ← wide light display   │
│ • Dashboard    ││  Org name                                           │
│   Properties   ││ ┌ hero panel ────────────────────────┐┌ stat ┐┌ stat┐
│   Units        ││ │ Collected in October     ◯ orbit  ││      ││     │
│   Tenants      ││ │ ৳ 84,000           gauge (lime arc)││      ││     │
│   …            ││ └───────────────────────────────────┘└──────┘└─────┘
└────────────────┘└─────────────────────────────────────────────────────┘
```

### Principles
1. **Boldness in one place.** The memorable element is the wide display type plus the orbit gauge on the dashboards and the landing hero. Everything else is quiet: hairlines, muted ink, generous spacing.
2. **Every decoration carries information.** The orbit ring is a real gauge (rent collected, occupancy). Status dots mean status. Nothing is numbered unless it is a sequence.
3. **Tokens only.** Feature code never names a palette colour (ADR 0008).
4. **Motion only on purpose.** One moment: the gauge arc draws in on load, and is static under `prefers-reduced-motion`. Hover states are colour changes only.
5. **Accessibility is a floor, not a feature.** AA contrast in both themes, visible focus (lime ring in dark, moss in light), 44px touch targets on phones, no horizontal overflow at 360px.

### Review against the brief
- *Revised:* the first draft was dark-only with lime as the primary everywhere. Lime fails as text and focus ring on light surfaces, and forcing dark mode breaks the user's OS preference and the light-mode axe scans. Light mode now flips the pair (moss primary, lime text on it). The sidebar stays dark in both modes, so the reference's identity survives in light mode too.
- *Revised:* the reference's all-caps tracked nav labels and eyebrows read as template chrome, and are harder to scan in a data-heavy app. We keep sentence case and use the dot motif instead.
- *Kept:* pills, hairlines, the orbit motif and wide display type are specific to the reference, not generic defaults.

## Steps
1. **Docs:** this plan and ADR 0008; index both in `docs/README.md`.
2. **Tokens, type and primitives**
   - `globals.css`: full token sets for light and dark (`canvas`, `brand`, tones, radius). Base styles: canvas body, focus ring, `font-display`, `.surface` / `.surface-interactive`, reduced-motion guard.
   - `tailwind.config.ts`: new colours, `fontFamily.sans` / `display`, radii.
   - `app/layout.tsx`: Archivo via `next/font` with the `wdth` axis; `themeColor` updated.
   - `components/ui`: button (pill shapes, `brand` variant), card, badge, input, textarea, select, checkbox, table, dialog/sheet/alert-dialog, dropdown, skeleton.
3. **Shared app components and shell:** `AppShell`, `SidebarNav`, `MobileNav`, `Logo`, `PageHeader`, `StatCard`, `EmptyState`, `StatusMessage`, `FilterChips`, `Pagination`, `DetailList`, `UserMenu`, skeletons; new `StatusBadge` and `OrbitGauge`.
4. **Feature badges and colours:** unit, tenancy, charge, maintenance and notice badges become `StatusBadge` tone maps. The timeline's internal note, the invite panel and the reminders list use tones. Repeated list-row and panel classes become `.surface-interactive` / `.surface`.
5. **Landing, auth and status pages:** a landing hero in the reference's spirit (wide headline, orbit backdrop, lime pill CTA); the auth layout gets the orbit backdrop and a refined card; the not-found and error pages use the canvas.
6. **Dashboards:** the landlord hero panel shows collection with an `OrbitGauge`, with occupancy, outstanding and maintenance stats beside it. The tenant hero shows the amount owed and what's next. Lists are restyled with shared components.
7. **Verification:** `pnpm lint`, `pnpm typecheck`, `next build`, the full E2E suite including the axe scans in both themes and the 360/768px overflow checks, plus a screenshot review of the key pages in both themes on desktop and mobile.

## Changelog
- 2026-10-11: Initial version.
- 2026-10-11: Done (branch `feature/ui-refresh`). Decisions made during implementation:
  - New shared components: `StatusBadge` (tones), `HeroPanel`, `OrbitGauge`, `OrbitBackdrop` and `IconRing` in `components/app/`, plus the `.surface` / `.surface-interactive` classes. The five feature badges are now tone maps with no colours of their own, and no raw palette classes remain in `app/`, `components/` or `features/`.
  - `CardTitle` uses the display cut by default, so every card heading picks up the new type without per-page changes.
  - The hero panels, the sidebar, the phone tab bar, the landing hero and the sign-in side panel use a `.dark` token scope, so they are moss in both themes. Radix portals (sheets, menus, dialogs) still follow the page theme.
  - The orbit gauge's text is drawn inside the SVG so it scales on phones. Its caption was dropped from the dashboard because it repeated the hint and was too small to read on a phone.
  - The theme still follows the OS (`system`). Defaulting to dark would match the reference more literally, but it would ignore user preference and change what the light-mode axe scans test.
  - Token contrast was checked numerically for every text/surface pair (all ≥ 4.5:1), then by the axe scans.
  - Verified: `pnpm lint`, `pnpm typecheck` and `pnpm build` pass. E2E: 116 passed, 4 skipped, 2 failed. All axe scans (light and dark) and the 360/768px overflow checks pass. The 2 failures are the same rent test on mobile and desktop. It expects a new charge to be "Unpaid", but with the default due day (the 5th) it is "Overdue" after the 5th of the month, so it is date-dependent and unrelated to this change. It was left for a separate fix.
- 2026-10-11: Renamed the product from "Bari_bhara" to **Bari Bhara** in the UI, page titles, emails, the Docker auth sender name and the docs. Technical identifiers stay as they were: the repo, the Supabase `project_id` (`bari-bhara`) and the example domains (`baribhara.example.com`). Accepted ADRs aren't edited (docs convention), so ADR 0001 still says "Bari_bhara"; it is the same product. The Supabase starter's stock share images (`opengraph-image.png`, `twitter-image.png`, which showed "Next.js Starter Kit") were replaced by a generated `app/opengraph-image.tsx` in the new style. Its route is excluded from the auth proxy so link-preview crawlers can fetch it.
