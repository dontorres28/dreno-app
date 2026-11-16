# Apple Audit — Dreno Sports

Audit date: 2026-11-16. Scope: every page + the shared design system.
Status: findings only, no code changed. Fixes held until the design PDF lands.

---

## Verdict

The **foundation is genuinely Apple-grade**. The problem isn't the system, it's
that the pages don't obey it. The design system defines a strict radius scale, an
8-point spacing grid, squircles, reduced-motion/transparency/contrast, scroll-reveal,
floating labels, matte buttons, translucent nav, safe-area insets, tabular numerals
and size-specific tracking. Then the pages hardcode their own radii, spacing, pills,
gradients and eyebrows on top. **That gap is why it still feels inconsistent despite
the polish.**

---

## What's solid — do not touch

`client/src/index.css` is the real asset:

- Radius tokens (12 / 18 / 26), 8-pt spacing tokens, squircle via `@supports` with
  correct round-corner exceptions
- `prefers-reduced-motion` / `-transparency` / `-contrast` all baked in, not bolted on
- Scroll-reveal (`animation-timeline: view()`), route cross-fade, global `:active` scale(0.96)
- Matte button shadow (de-glossed), `.label` de-eyebrowed, translucent nav, iOS insets,
  16px inputs (no zoom-on-focus), tabular nums, display tracking negative / body near-zero

Keep this as the single source of truth.

---

## What needs to change — ranked by impact

### 1. The scale exists but nobody uses it (the real consistency killer)

- [ ] **Radius:** system says 12/18/26. Pages use **44 one-off radii** off any token:
  `16` (x16), `20` (x14), `22` (x12), `24` (x2). Cards look subtly different on every screen.
- [ ] **Button shape is split-brain:** `.btn-primary` is a 14px rounded-rect, but
  **23 of 40 pages** hand-roll `borderRadius: 50` pills for secondary/filter/invite buttons.
  Two button languages in one app. (The CSS comment says "same pill shape" over a 14px
  value — the contradiction is baked in; reconcile it.)
- [ ] **Spacing:** the 8-pt grid tokens are essentially **unused inline**. Pages hardcode
  off-grid rems: `1.25rem`=20px (x61), `0.875rem`=14px (x37), `0.625rem`=10px (x17).
  Nothing lands on the grid, so vertical rhythm drifts page to page.

One decision, applied once: pick **one radius ladder, one button shape, grid-only spacing**,
then sweep all pages to tokens. Highest-leverage fix. The PDF should pin these down.

### 2. Two pages missed the de-shine sweep entirely

- [ ] `client/src/pages/Settings.tsx:278,289,297` — athlete Settings hero still has a
  **glossy gradient + radial white glow + gradient-filled avatar**, while AdminSettings is
  now solid/matte. The two settings pages don't match.
- [ ] `client/src/pages/CoachAthleteHub.tsx:187,253,259` — still the glossy
  `linear-gradient(135deg,#0B5FD4,#083C86)` hero card + white radial glow — the exact
  pattern already replaced with solid `--accent-strong` everywhere else.
- [ ] `client/src/pages/Playbook.tsx:88` — glossy icon tile gradient.

Legit, keep: the `linear-gradient(to top, var(--bg)...)` image scrims on
CoachProfile / CoachProfileEdit / CoachAthleteHub, and the DrillSigh breathing-orb
radials — correct Apple technique, not shine.

### 3. Eyebrow remnants that escaped the sweep

- [ ] `client/src/pages/Signal.tsx:68,132,181` — **three uppercase tracked-caps eyebrows.**
  The Signal feature was never run through the sweep. Decide: is its geological aesthetic
  meant to be different, or does it align? Right now it's an island.
- [ ] `client/src/pages/CoachAthleteHub.tsx:263,424` — uppercase kickers
- [ ] `client/src/pages/Admin.tsx:197` — 10px/700 status badge (same one fixed on the other
  admin pages; this one's still old)
- [ ] `client/src/pages/CoachProfileEdit.tsx:361` — uppercase "NEW" badge
- [ ] `client/src/pages/onboarding/CoachOnboard.tsx:576,587` — "Minimum"/"Maximum" with tracking

### 4. Copy rule violations (standing "no em dash / no middle-dot" rule)

- [x] `client/src/pages/Drills.tsx:15` — em dash in body copy. Fixed: now "Tap fast, but freeze on blue."
- [x] Em dash used as the empty-value glyph. Fixed: text fallbacks (AdminDashboard, Admin,
  AdminOnboard) now "Not set" / "No email"; the numeric stat slot (CoachAthleteHub) uses an
  en dash (Apple Health's no-data glyph). Remaining `—` in CoachOnboard is a decorative list
  bullet, folded into the eyebrow/decoration sweep below.

---

## What's missing (Apple moves not yet present)

- [ ] **One idea per scroll / progressive disclosure** — dashboards and hubs stack everything
  at once. Apple chunks: one headline, one visual, detail one click deeper. Decide per page.
- [ ] **A hero scroll moment** — the `.reveal` machinery exists but isn't driving a single
  signature moment (the Signal visual is the obvious candidate).
- [ ] **Consistent empty/loading/error trio** — some pages have composed empty states, others
  just spinners. Not audited exhaustively; verify during the pass.

---

## Suggested order once the PDF lands

1. Lock the scale (radius ladder + button shape + grid spacing) in the PDF, then sweep all
   pages to tokens.
2. De-shine Settings, CoachAthleteHub, Playbook to match.
3. Finish the eyebrow sweep (Signal decision + the stragglers above).
4. Copy pass (em dashes).
