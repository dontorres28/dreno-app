-- Dreno schema ported to Neon (Lakebase Postgres) + Managed Better Auth + Data API.
-- User ids are TEXT (Better Auth / auth.user_id() returns text), not UUID.
-- RLS is mandatory: the Data API is browser-facing, authorized entirely by
-- these policies + GRANTs. auth.user_id() = the caller's id from the JWT.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Core identity tables (id = Neon Auth user id, TEXT) ────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('athlete','coach','administrator')),
  name TEXT,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.athletes (
  id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sport TEXT, competition_level TEXT, timezone TEXT, session_format_pref TEXT,
  onboarded BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.coaches (
  id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT, bio TEXT, expertise_tags TEXT[] DEFAULT '{}', credentials TEXT,
  linkedin_url TEXT, hourly_rate INTEGER,
  verified_status TEXT DEFAULT 'pending' CHECK (verified_status IN ('pending','verified','rejected')),
  stripe_account_id TEXT, photo_url TEXT, sports TEXT[] DEFAULT '{}', rejection_reason TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  min_session_min INTEGER DEFAULT 30, max_session_min INTEGER DEFAULT 120,
  framework_input_type TEXT CHECK (framework_input_type IN ('voice','text')),
  framework_raw_text TEXT, framework_voice_memo_path TEXT, framework_bullets JSONB,
  framework_updated_at TIMESTAMPTZ, framework_generate_count INT DEFAULT 0, framework_generate_date DATE
);

CREATE TABLE IF NOT EXISTS public.administrators (
  id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_name TEXT, org_type TEXT, sport TEXT, athlete_limit INTEGER, plan_tier TEXT,
  phone TEXT, referral TEXT, onboarded BOOLEAN DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,  -- platform-admin powers gate (is_admin)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Domain tables (own PKs stay UUID; user refs are TEXT) ──────────────────────
CREATE TABLE IF NOT EXISTS public.athlete_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  challenge_tag TEXT NOT NULL, rank INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  availability_id UUID REFERENCES public.availability(id),
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ, duration_min INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  price_cents INTEGER NOT NULL DEFAULT 0, commission_cents INTEGER NOT NULL DEFAULT 0,
  room_url TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  athlete_id TEXT REFERENCES public.profiles(id), coach_id TEXT REFERENCES public.profiles(id),
  coach_notes TEXT, athlete_notes TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horizon TEXT CHECK (horizon IN ('short','mid','long')), title TEXT NOT NULL,
  smart_detail TEXT, status TEXT DEFAULT 'active', target_date DATE, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT, shared_with_coach BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL,
  sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.athlete_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT, signal_type TEXT, value JSONB, recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- drill_results (inferred from app usage: Drills/Dashboard/DrillReaction)
CREATE TABLE IF NOT EXISTS public.drill_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drill_type TEXT NOT NULL,
  raw_score NUMERIC, composite_score NUMERIC,
  metadata JSONB, completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS drill_results_athlete_idx ON public.drill_results(athlete_id);

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  useful TEXT CHECK (useful IN ('yes','sort_of','no')), mood INT CHECK (mood BETWEEN 1 AND 10),
  admin_note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (booking_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS public.coach_rebook_stats (
  coach_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sessions_total INT DEFAULT 0, athletes_first_60d_plus INT DEFAULT 0,
  athletes_rebooked INT DEFAULT 0, rebook_rate FLOAT, updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_check_in_aggregate (
  coach_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  useful_rate_30d FLOAT, mood_avg_30d FLOAT, response_count_30d INT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playbook_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'general' CHECK (section IN ('general','focus','pre-performance','resilience','identity','recovery')),
  body TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), first_viewed_at TIMESTAMPTZ
);

-- ── Admin helper (SECURITY DEFINER bypasses RLS to avoid recursion) ────────────
-- Platform-admin powers require approval; unapproved admins only manage their own org.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.administrators WHERE id = auth.user_id() AND approved = true) $$;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_profiles_own ON public.profiles FOR ALL USING (id = auth.user_id()) WITH CHECK (id = auth.user_id());
CREATE POLICY p_profiles_admin ON public.profiles FOR SELECT USING (public.is_admin());

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ath_own ON public.athletes FOR ALL USING (id = auth.user_id()) WITH CHECK (id = auth.user_id());
CREATE POLICY p_ath_admin ON public.athletes FOR SELECT USING (public.is_admin());

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_coach_own ON public.coaches FOR ALL USING (id = auth.user_id()) WITH CHECK (id = auth.user_id());
CREATE POLICY p_coach_verified_read ON public.coaches FOR SELECT USING (verified_status = 'verified');
CREATE POLICY p_coach_admin ON public.coaches FOR SELECT USING (public.is_admin());

ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_admin_own ON public.administrators FOR ALL USING (id = auth.user_id()) WITH CHECK (id = auth.user_id());

ALTER TABLE public.athlete_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_chal_own ON public.athlete_challenges FOR ALL USING (athlete_id = auth.user_id()) WITH CHECK (athlete_id = auth.user_id());

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_avail_coach ON public.availability FOR ALL USING (coach_id = auth.user_id()) WITH CHECK (coach_id = auth.user_id());
CREATE POLICY p_avail_read ON public.availability FOR SELECT USING (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_book_read ON public.bookings FOR SELECT USING (athlete_id = auth.user_id() OR coach_id = auth.user_id() OR public.is_admin());
CREATE POLICY p_book_ins ON public.bookings FOR INSERT WITH CHECK (athlete_id = auth.user_id());
CREATE POLICY p_book_upd ON public.bookings FOR UPDATE USING (athlete_id = auth.user_id() OR coach_id = auth.user_id());

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sess_part ON public.sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.athlete_id = auth.user_id() OR b.coach_id = auth.user_id())));

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_goals_own ON public.goals FOR ALL USING (athlete_id = auth.user_id()) WITH CHECK (athlete_id = auth.user_id());

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_journal_own ON public.journal_entries FOR ALL USING (athlete_id = auth.user_id()) WITH CHECK (athlete_id = auth.user_id());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_msg_read ON public.messages FOR SELECT USING (
  sender_id = auth.user_id() OR
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = thread_id AND (b.athlete_id = auth.user_id() OR b.coach_id = auth.user_id()))
);
CREATE POLICY p_msg_send ON public.messages FOR INSERT WITH CHECK (sender_id = auth.user_id());

ALTER TABLE public.athlete_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_rec_own ON public.athlete_records FOR SELECT USING (athlete_id = auth.user_id());
CREATE POLICY p_rec_coach ON public.athlete_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.athlete_id = athlete_records.athlete_id AND b.coach_id = auth.user_id() AND b.status = 'confirmed')
);

ALTER TABLE public.drill_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_drill_own ON public.drill_results FOR ALL USING (athlete_id = auth.user_id()) WITH CHECK (athlete_id = auth.user_id());

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sf_own ON public.session_feedback FOR ALL USING (athlete_id = auth.user_id()) WITH CHECK (athlete_id = auth.user_id());

ALTER TABLE public.coach_rebook_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_rebook_read ON public.coach_rebook_stats FOR SELECT USING (true);

ALTER TABLE public.coach_check_in_aggregate ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_agg_coach ON public.coach_check_in_aggregate FOR SELECT USING (coach_id = auth.user_id());

ALTER TABLE public.playbook_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_pb_ath ON public.playbook_notes FOR SELECT USING (athlete_id = auth.user_id());
CREATE POLICY p_pb_coach_read ON public.playbook_notes FOR SELECT USING (coach_id = auth.user_id());
CREATE POLICY p_pb_coach_ins ON public.playbook_notes FOR INSERT WITH CHECK (coach_id = auth.user_id());
CREATE POLICY p_pb_coach_upd ON public.playbook_notes FOR UPDATE USING (coach_id = auth.user_id());

-- ── Grants for the Data API roles ──────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
-- Anonymous (logged-out) gets nothing by default; verified-coach browsing requires login in the app.
