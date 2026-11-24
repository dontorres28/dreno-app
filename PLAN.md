# Dreno → Neon: full migration plan

Goal: retire the Express/Supabase server. Everything runs on Neon — client talks directly to the
Neon Data API (RLS-authorized), with two small Neon Functions for the only jobs that need a secret.

## Target architecture

- **Client → Neon Data API** (acting as the signed-in user, RLS enforced) for all CRUD:
  bookings, availability, goals, journal, drills, messages, coach profile, session feedback,
  playbook, admin coach verify/list, org overview/invites, coach roster, Signal/observation.
- **Neon Functions** (elevated, hold the secrets) for exactly two jobs:
  - `framework-generate` — Anthropic call + 3/day rate limit (coach AI framework).
  - `notify` — Resend emails (booking requested/confirmed/cancelled).
- **Neon Realtime** for live messages + session presence (replaces the `.channel` no-op).
- **Neon Object Storage** for avatar/photo uploads (replaces the `.storage` no-op).
- Delete `server/` once the above is live.

## RLS additions needed (so the client can do cross-user reads safely)

Admin self-signup is being removed (admin becomes invite-only), so `is_admin()` is trustworthy.
- `administrators`: **add missing columns** (org_name, org_type, sport, athlete_limit, plan_tier,
  phone, referral, onboarded). Fixes admin signup. *(additive, idempotent)*
- `profiles`: allow SELECT of name/photo for a user you share a booking or playbook note with
  (so coach names resolve on the athlete's playbook, athlete names on the coach roster).
- `coaches`: allow admin UPDATE (verify/reject) — currently admin can only SELECT.
- `drill_results` / `session_feedback`: allow a coach to SELECT rows for an athlete they share a
  confirmed/completed booking with (powers Signal + check-in aggregate client-side).
- `administrators` + org membership: allow an org admin to read/manage their members.

All policies are additive. No table drops, no column drops, no data deletion. Production branch
gets a snapshot before any migration run.

## Phases

**Phase 1 — demo-critical, client-direct, no secrets, no CLI (DOING NOW)**
1. Additive migration: `administrators` columns → admin onboarding saves.
2. Booking lifecycle → direct Neon: create, confirm, cancel, create-room (Jitsi URL is
   deterministic, no secret). Powers the athlete↔coach loop end to end.
3. Session room → read booking + room_url directly; join Jitsi.
4. Playbook (athlete read + coach note) and athlete's own Signal → direct Neon.
   → This makes the **booking → video → planning** demo work.

**Phase 2 — the rest of the app on client-direct + RLS**
5. Admin: coach verify/reject/list, org overview, invites, remove, flags → direct Neon + the RLS
   policies above. Remove the public "Admin" signup tile (invite-only).
6. Coach: roster, athlete hub, check-in aggregate, Signal-for-coach, session feedback → direct Neon.
7. Delete the `/api/*` call sites and `client/src/lib/api.ts`.

**Phase 3 — Functions + Realtime + Storage (needs `neon login` once)**
8. `framework-generate` + `notify` Functions; wire the two call sites.
9. Neon Realtime for messages/presence; Neon Object Storage for photo uploads.
10. Delete `server/`.

## What's blocked on you
- `neon login` + `neon deploy` to publish the two Functions (Phase 3). One command, your keystroke.
- Rotate the leaked keys (Supabase service-role, ADMIN_PASSWORD, Vercel OIDC) — still in git history.

## Non-negotiables
- Additive migrations only; snapshot the production branch first; verify each column/policy exists
  before the code relies on it. No destructive change without an explicit snapshot + your go.
