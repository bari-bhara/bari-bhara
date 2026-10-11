# 0008 — Token-driven "moss & lime" visual language

- **Status:** Accepted
- **Date:** 2026-10-11

## Context
The UI was the stock shadcn/ui look: neutral greys, Geist, small radii, shadows on every card. It worked, but it was hard to tell apart from any other starter app, and colours were hard-coded in several places: five feature status badges and a few notes each had their own `emerald-*`, `sky-*`, `amber-*`, `red-*` and `violet-*` classes for light and dark. The user asked for a more modern, friendlier UI based on a reference design (dark olive canvas, light lime accent, wide light display type, pill controls, hairline borders), while keeping the system modular.

The constraints:
- WCAG 2.1 AA in **both** light and dark mode. `e2e/a11y.spec.ts` scans every main page with axe in both schemes and fails on any violation.
- The theme follows the OS by default (next-themes `system`), and the axe scans rely on that.
- No new runtime dependencies, and no change to page structure or copy that the E2E tests read.

## Decision
We will define the look entirely in **design tokens**, and build features only from tokens and shared components:

1. **Tokens** (`app/globals.css`, exposed through `tailwind.config.ts`). Light and dark each define the full set:
   - `canvas`: the page backdrop behind the shell. `background` and `card` are the raised surfaces on top of it.
   - `primary`: lime with dark-moss text in dark mode; dark moss with lime text in light mode, because lime on a light background fails contrast as text, focus ring or checkbox border.
   - `brand`: always lime, for the signature marks (the active-nav dot, the orbit gauge arc, the logo mark).
   - Semantic **tones** `success`, `warning`, `info`, `highlight` (plus the existing `destructive`), each tuned to pass AA as text in its mode.
   - The palette is olive-tinted throughout (hue ≈ 80–90°), not neutral grey.
2. **Type:** one family, **Archivo** (variable `wght` and `wdth` axes, via `next/font`). Body text is normal width. Headings and key figures use the wide cut (`font-display`: `wdth` 125, light to regular weight). Width, not a second typeface, carries the display personality.
3. **Shape:** buttons, chips and badges are pills; surfaces are 16px-radius panels with hairline borders and no drop shadow; inputs are 12px.
4. **Shared building blocks:**
   - `components/app/status-badge.tsx` takes a `tone` and draws a dot plus a label. Every feature badge maps its domain status to a tone and keeps no colours of its own.
   - `.surface` / `.surface-interactive` component classes are the one definition of a panel and a clickable list row.
   - `OrbitGauge` is the one decorative-but-meaningful motif: a thin ring whose lime arc shows a percentage (rent collected, occupancy).
5. **Rule for new UI:** no raw palette classes (`bg-emerald-50`, `text-sky-800`, …) in `app/` or `features/`. Use a token, a tone, or a shared component. A new colour need becomes a new token in both modes, checked with the axe scan.

## Alternatives considered
- **Copy the reference literally (always dark, lime everywhere):** lime fails as text and focus colour on light surfaces, and forcing dark mode ignores user preference and the existing light-mode a11y guarantee.
- **A second display typeface (e.g. an expanded grotesk from another family):** Archivo's width axis gives the same wide look from one font file, with less to load and a consistent rhythm between headings and body.
- **Tailwind v4 / CSS-first theme, or a component library swap:** a bigger migration than a visual refresh needs. The shadcn + Tailwind 3 setup already supports CSS-variable tokens.
- **Keep per-feature badge colours:** that's the duplication this ADR removes. Five files would have to change for every palette tweak.

## Consequences
- Re-theming (or adding a brand colour, or a third theme) is a `globals.css` change.
- Feature code that needs a colour has to go through a token or tone. Reviewers should reject raw palette classes.
- Components added later with the shadcn CLI arrive with stock radii and shadows; align them with the shapes above when adding them.
- The display width depends on font support for `font-stretch`. Where the variable font fails to load, headings fall back to a normal-width sans, which is acceptable.
- Revisit if a white-label or per-organisation theme is needed: tokens make it possible, but it would need a way to scope them per org.
