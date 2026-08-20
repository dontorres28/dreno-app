-- ── session_feedback ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  useful        TEXT CHECK (useful IN ('yes', 'sort_of', 'no')),
  mood          INT  CHECK (mood BETWEEN 1 AND 10),
  admin_note    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, athlete_id)
);

ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- Athlete can insert and read their own rows only
CREATE POLICY "sf_athlete_own" ON session_feedback
  FOR ALL USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- ── coach_rebook_stats ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_rebook_stats (
  coach_id                    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  sessions_total              INT     DEFAULT 0,
  athletes_first_60d_plus     INT     DEFAULT 0,
  athletes_rebooked           INT     DEFAULT 0,
  rebook_rate                 FLOAT,
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coach_rebook_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rebook_public_read" ON coach_rebook_stats FOR SELECT USING (true);

-- ── coach_check_in_aggregate ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_check_in_aggregate (
  coach_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  useful_rate_30d   FLOAT,
  mood_avg_30d      FLOAT,
  response_count_30d INT DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coach_check_in_aggregate ENABLE ROW LEVEL SECURITY;
-- Coach reads only their own aggregate
CREATE POLICY "agg_coach_own" ON coach_check_in_aggregate
  FOR SELECT USING (coach_id = auth.uid());
