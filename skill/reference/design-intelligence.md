# Lithos Ultra — Design Intelligence

Goal: customer-facing work must read as considered, custom software for *this* business, not a
generic AI template.

## 1. Understand before drawing
Write a short **design brief** in `.lithos/design-brief.md` (creative director owns it):
- Business, audience (who, context of use, device mix, expertise), primary job of the product.
- Brand: existing assets (logo, colours, fonts, tone). If none, propose a direction with 2–3 adjectives
  and the reasoning; do not invent a fake brand history.
- **Screen inventory**: for every screen — purpose, primary user action, key data, success state,
  empty/loading/error states.
- What the design must *not* look like (competitor clichés, template tropes).

## 2. Design system first
Owned by `lithos-design-systems-specialist`, implemented as code (CSS variables / Tailwind theme /
tokens file), not a picture:
- **Type**: one or two families with a reason (e.g. a precise grotesk for data-dense dashboards, a
  humanist sans for portals). A modular scale (e.g. 1.2 ratio) with 5–7 steps, line-heights per step,
  `font-variant-numeric: tabular-nums` for numbers in tables and KPIs.
- **Space**: 4px base grid; a fixed spacing scale; consistent section rhythm.
- **Colour**: neutral ramp + one brand accent + semantic colours (success/warn/danger/info) with
  WCAG AA contrast checked; dark mode defined from the same tokens when in scope.
- **Components**: buttons, inputs, selects, tables, tabs, dialogs, toasts, empty states, skeletons —
  each with hover/focus-visible/active/disabled/loading states.
- **Radius & elevation**: small, consistent set; borders before shadows.

## 3. Anti-patterns (reject in review)
- Purple-to-blue hero gradients, glassmorphism everywhere, gradient text as decoration.
- Card soup: every piece of content in a rounded shadowed card. Use layout, whitespace, dividers and
  tables; cards only for genuinely discrete, repeatable objects.
- Emoji as icons; random icon sets mixed; icons without labels for primary actions.
- Meaningless motion: fade-in-on-scroll for everything, bouncing CTAs, parallax without purpose.
- Lorem ipsum or fake testimonials/logos/metrics presented as real. Use realistic sample data
  clearly marked as sample.
- Centered-everything layouts for data apps; giant hero sections on internal tools.
- Inconsistent spacing, more than ~3 font sizes per view, low-contrast grey text.

## 4. Patterns that read as professional
- **Dashboards / internal tools**: dense but calm; left nav or top nav with clear wayfinding; tables
  with sticky headers, sortable columns, right-aligned numerals; filters persist in the URL; KPIs
  with comparison period and units; charts only when the trend matters.
- **Customer portals**: task-first home ("what do I need to do"), clear status of requests/invoices/
  bookings, plain-language copy, generous touch targets on mobile.
- **Marketing / digital experiences**: one strong idea per section, real photography or purposeful
  illustration, typographic hierarchy doing the work, fast LCP.
- **Forms**: labels above inputs, inline validation on blur, helpful error text, logical grouping,
  autosave for long forms.

## 5. Motion & interaction
Motion must explain a change (state, hierarchy, causality) or give feedback. 150–250 ms for UI
transitions, ease-out for entering, ease-in for exiting; respect `prefers-reduced-motion`.
Interactions: focus-visible rings, keyboard paths for every action, optimistic UI where safe.

## 6. Accessibility baseline (WCAG 2.2 AA)
Semantic HTML, landmarks, heading order, labels, contrast ≥ 4.5:1 text / 3:1 UI, focus order,
target size ≥ 24px, no info by colour alone, accessible names for icon buttons, `axe` clean.

## 7. Verification (real, not imagined)
- Run the app locally; capture Playwright screenshots at **375×812, 768×1024, 1440×900**
  (deviceScaleFactor 1 for review; 2 for user-facing deliverables), light and dark when supported.
  Store under `.lithos/screenshots/`.
- Check: no horizontal scroll at 375, tap targets, nav collapse, table overflow strategy, text wrap,
  empty/error states.
- Run `axe-core` (e.g. `@axe-core/playwright`) if available and record the result with `mc.mjs test add`.
- An independent design reviewer (who did not build the screens) critiques screenshots against the
  brief and §3; fixes go back to the owner; max 2 rounds.
- If no browser is available, say so explicitly in the report — do not claim visual verification.
