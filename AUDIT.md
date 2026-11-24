# Dreno — Full App Audit

Date: 2026-11-16. Scope: every role (athlete, coach, admin), the drills, the backend, the
market, design consistency, security and legal. This is a read-only audit. Nothing was changed.

---

## 0. The one-line verdict

The **solo-athlete half of the app works and looks good.** The **marketplace + coaching + org +
AI half is disconnected** because the backend is stuck mid-migration: the browser talks to Neon
(live data), but the Express server still talks to the old, empty Supabase project and can't even
validate Neon's login tokens. Every feature that routes through the server is down. The admin
signup you hit is one symptom of a second, separate problem (schema drift). Fix the backend split
first; everything else is cosmetics on top of a severed spine.

---

## 1. Critical — broken right now (P0)

### 1.1 The whole Express API layer is disconnected from the live data
- The browser reads/writes directly to **Neon** (`client/src/lib/supabase.ts` → `@neon/neon-js`).
- The server (`server/index.js`) still does `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` against
  the **old Supabase project** — which holds no live data — and validates every request with
  `supabase.auth.getUser(token)`. The tokens are now minted by **Neon Better Auth**, so Supabase
  can't verify them: **every `requireAuth` route returns 401.**
- Net effect — all of this is dead: creating a booking, confirm/cancel booking, create video room,
  coach verify/reject, coach roster, session feedback, check-in aggregate, **Signal**, **Playbook**,
  coach framework AI, org overview, invite/remove coaches and athletes, passkeys.
- Because bookings are created **only** through the server, no bookings ever land in Neon. The
  athlete "next session" and coach "new requests" are permanently empty. **The marketplace's core
  transaction loop is severed end to end.**

Pages that will silently fail or show empty state today (all server-dependent):
`Book`, `CoachDashboard`, `CoachAthletes`, `CoachAthleteHub`, `CoachProfile`, `SessionRoom`,
`SessionFeedback`, `Playbook`, `Signal`, `Admin`, `AdminDashboard`, `AdminAthletes`,
`AdminSettings`, `AdminFlags`.

**Fix:** point the server at Neon and validate Neon tokens — or (cleaner, given the client already
does direct-Neon everywhere else) retire most of the server and move the few server-only jobs
(booking lifecycle, AI framework call, email) to Neon Functions / direct writes with RLS. This is
the single highest-leverage fix in the codebase.

### 1.2 Admin can't register (the bug you hit) — schema drift
- `AdminOnboard.finish()` writes 8 columns to `administrators`:
  `org_name, org_type, sport, athlete_limit, plan_tier, phone, referral, onboarded`.
- The `administrators` table (in **both** `neon/schema.sql` and `supabase/schema.sql`) has only
  `id` and `created_at`. So the upsert fails → toast "Could not save" → the admin is stuck on
  onboarding and never reaches the dashboard. **Admin signup has never been able to complete.**
- `AdminDashboard` then reads `/api/org/overview` (dead per 1.1) and also expects those columns.
- **Fix:** one additive migration adding the missing columns to `administrators`, then verify the
  column exists before relying on it. (Athletes/coaches don't hit this because their tables already
  carry the columns their onboarding writes.)

### 1.3 Self-signup as administrator is a security hole
- The signup form lets anyone pick "Admin", and RLS (`p_admin_own … WITH CHECK (id = auth.user_id())`)
  lets them insert their own `administrators` row. `is_admin()` then returns true, which grants
  **SELECT on every athlete, coach and booking** via the `p_*_admin` policies.
- Today the onboarding failure (1.2) accidentally blocks it, but the moment you fix 1.2 you open a
  self-serve path to org-wide data. **Admin must be invite/approve only**, not a public signup tile.

### 1.4 Live messaging and file uploads are stubbed out
- `supabase.channel` and `supabase.storage` are **no-ops** (`client/src/lib/supabase.ts`).
- Consequence: **Messages** never update live (you must refresh), session-room presence/LiveRead is
  inert, and **every avatar/photo upload fails** with "being reconnected" — this hits
  `CoachProfileEdit`, `Settings`, and `CoachOnboard`. A coach literally cannot upload a profile
  photo, which also means they can never reach 100% profile completeness.
- **Fix:** wire Neon Realtime + Neon Object Storage (already flagged in a `ponytail:` comment).

### 1.5 Secrets are in git history (carried over, still open)
- `.gitignore` is now hardened, but the previously-committed `server/.env` (live Supabase
  service-role JWT + `ADMIN_PASSWORD`) and `.env.production` (Vercel OIDC token) are **still in
  history**. Untracking doesn't scrub them. **Rotate every one of those keys.** Until then anyone
  with the repo history has your service-role key.

---

## 2. Role-by-role walkthrough

### Athlete — mostly healthy
Works (direct Neon): Dashboard, Drills + all four games, Journal, Goals, Settings (except photo).
The athlete daily loop is the strongest, most finished part of the product.
Broken (server): finding/booking a coach, the session room, session feedback, Playbook, Signal,
live messaging. So an athlete can train and journal, but **cannot actually transact with a coach** —
the thing the marketplace exists for.

### Coach — half-dead
Works: profile edit form itself (text fields), reading verified coaches.
Broken: dashboard (requests/next session come from dead bookings), confirm/accept/decline,
roster (`/api/coach/athletes`), athlete hub, check-in aggregate, framework AI generation, and
photo upload. A coach can fill in text but can't be verified usefully, can't get bookings, can't see
athletes, can't run the AI framework. Effectively non-functional today.

### Admin — fully blocked
Can't finish onboarding (1.2). Even if patched, the dashboard, athlete list, settings, invites and
flags all depend on the dead server (1.1). And the signup path itself is a security hole (1.3).
Admin is the least-finished role and needs the most work after the backend is reconnected.

---

## 3. The drills — current state + the redesign

Four games, consistent shell (`TestShell` → intro / running / done), shared "signal-orb" material:
- **Quick Tap** (reaction time) — clean, low-latency, median of 5, keyboard + touch. Best of the four.
- **Stop & Go** (go/no-go) — inhibition.
- **Follow the Dot** (eye-track) — smooth pursuit.
- **Breathe** ("the_sigh") — a 4-1-8 breathing cycle, 3 rounds.

What's genuinely good: plain kid-clear names and one-liners, a numbered 1–2–3–4 path, "done today"
ticks, a streak, auto-advance between trials so there's one less tap. This is already close to the
right instinct.

Where it falls short of "how Jony Ive would design the drill itself" (not just the page):
1. **No meaning after the number.** Quick Tap says "312ms — Solid" and stops. The athlete learns a
   number, not what it means for *them* today. A drill should answer "am I sharper or duller than
   my normal?" — show the result against the athlete's own rolling baseline (a faint band), not an
   absolute label. The number becomes a signal, not a score.
2. **No "why am I doing this."** None of the four connect the game to the sport. One line before or
   after — "reaction under fatigue is the first thing to go late in a game" — turns a minigame into
   training. Right now they're abstract.
3. **Inconsistent material.** Reaction/Go/Eye use a flat matte field (correct, per the house
   direction). **Breathe uses radial gradients, blur glows and an "ambient bloom"** — exactly the
   gloss the rest of the app removed. It's the one screen that looks like a different app. Decide:
   either the breathing orb is the single sanctioned "lit" moment, or it goes matte like everything
   else. It can't be half.
4. **The sigh isn't a sigh.** A physiological sigh (the fastest evidence-based calm-down) is a
   double-inhale then a long exhale. The current 4-1-8 is a fine box-ish breath but mislabeled.
   Either rename it "Breathe" fully (the UI already does) and drop "the_sigh" as the internal key's
   implied protocol, or implement the actual double-inhale so the science matches the name.
5. **One idea per screen, carried into the game.** The intros are good; the *result* screens try to
   show rating + big number + 5 chips + two buttons at once. Ive's "one idea per scroll" applies
   inside the drill: result screen = one number against your baseline, then the next step. Move the
   per-trial chips behind a tap ("see splits").
6. **Haptics/sound as the feedback, not decoration.** Reaction already uses haptics well. Extend the
   same causal feedback to Go/No-Go (a wrong "go on blue" should *feel* wrong) so correctness is felt
   before it's read.

This is a redesign worth doing — but **after** the backend, because drills are the part that already
works, and the broken half is costing you real users.

---

## 4. What the app is missing (vs. what an athlete-mindset app needs in 2026)

The 2026 market (ZenQuill, Athlete Mindset, Mastery, CTRL/MND, Perform, MindSport, Lucid, Mettle,
Restoic) converges on a stack. Here's where Dreno sits:

| Capability | Market norm | Dreno today |
|---|---|---|
| Daily check-in / mood | Everyone | Partial (journal only) |
| **Visualization / mental imagery** | **Everyone** | **Missing — biggest gap** |
| Breathwork | Everyone | Yes (Breathe) |
| Journaling (often voice) | Everyone | Yes (text) |
| Streaks / progress tracking | Everyone | Yes |
| Resilience / readiness score + trend | ZenQuill, Mettle | Partial (Signal, but server-dead and not a readable trend) |
| **Reaction / cognitive drills** | **Almost no one** | **Yes — this is your moat** |
| AI companion / check-in chat | Most solo apps | Only coach-side framework AI |
| Human coaches | Mettle, Restoic, Lucid | Yes — your other moat (marketplace) |
| Guided audio / meditations / courses | Lucid, Optimize, Calm | None |
| Pre-game / "game day" routine | Lucid "Game Day" | None (Playbook has a "pre-performance" section but no ritual flow) |

**Read:** Dreno's two real differentiators are **cognitive drills** and a **human-coach
marketplace** — almost no competitor has either. The glaring hole is **visualization/mental
imagery**, which is table stakes everywhere else and you have zero of. After that: a readable
readiness trend (make Signal legible, not just pretty) and a pre-performance routine that uses the
drills + breathing + imagery together before a game.

---

## 5. Design-consistency debt (the Jony-Ive sweep you asked for earlier)

Still outstanding across ~20 pages; the landing is the only one done:
- `borderRadius: 50` pill CTAs and one-off 44px radii that should join the 12/18/26 ladder. They're
  scattered through onboarding (AdminOnboard "Back" buttons, pills), Signup ("email-pill"), Drills
  ("See the scoreboard" pill), and the toast style in `App.tsx` (radius 50).
- Gradients/glows survive in `DrillSigh` and the Signup demo circle, against the matte direction.
- One radius language, one button shape, one spacing grid — the landing proves the target; the rest
  of the app hasn't been swept yet.

Not urgent next to the backend, but it's the "every box, every button" pass you wanted and it's real.

---

## 6. Legal / GDPR (carried over, not yet built)
- No **Impressum** page (route + footer link + `[PLACEHOLDER]` fields via existing `LegalPage`+`L`).
- No **account deletion / data export** (GDPR erasure + portability). Sign-out works; delete does
  not exist. Blocked on the same backend decision as 1.1 — once the server is reconnected (or
  retired), erasure should reuse the proven logic in `server/scripts/cleanup-test-accounts.mjs`.
- Existing Terms/Privacy/Cookies/Refunds need a Swiss DSG + GDPR pass.

---

## 7. Prioritized plan — fix / add / remove / adjust

**Fix (do first, in order):**
1. Reconnect the backend: server → Neon + validate Neon tokens, or retire the server into direct-Neon
   writes + Neon Functions for the 3 real server jobs (booking lifecycle, framework AI, email). (1.1)
2. Add the missing `administrators` columns so admin onboarding saves. (1.2)
3. Wire Neon Realtime + Object Storage so messages update and photos upload. (1.4)
4. Rotate the leaked keys. (1.5)

**Remove / lock down:**
5. Remove the public "Admin" signup tile; make admin invite-and-approve only. (1.3)

**Adjust:**
6. Drills: result-against-baseline, a one-line "why," make Breathe matte (or sanction it as the one
   lit screen), move splits behind a tap. (§3)
7. Finish the radius/button/matte sweep across the remaining pages. (§5)

**Add:**
8. **Visualization / mental imagery** — the one feature the whole market has and you don't. (§4)
9. Make **Signal** a readable readiness trend, not just a daily SVG. (§4)
10. A **pre-performance routine** that chains breathing + a drill + imagery before a game. (§4)
11. Impressum + account deletion + data export. (§6)

My recommendation: **1 → 2 → 3 → 4 → 5 this week** (the product is effectively half-offline until
then), then the drill redesign and the visualization feature, then the design sweep and legal.

Sources (market): purposesoulathletics.com, zenquill.ai, mindandmuscle.ai, athletemindset.app,
medium.com/get-lucid, techcrunch.com (Lucid), apps.apple.com (Mastery, Athlete Mindset, CTRL/MND,
Perform, MindSport, NowRise, Restoic).
