-- 009: administrators columns that AdminOnboard writes but the table never had.
-- Additive + idempotent. Fixes admin signup (upsert was failing on missing columns).
ALTER TABLE public.administrators
  ADD COLUMN IF NOT EXISTS org_name      TEXT,
  ADD COLUMN IF NOT EXISTS org_type      TEXT,
  ADD COLUMN IF NOT EXISTS sport         TEXT,
  ADD COLUMN IF NOT EXISTS athlete_limit INTEGER,
  ADD COLUMN IF NOT EXISTS plan_tier     TEXT,
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS referral      TEXT,
  ADD COLUMN IF NOT EXISTS onboarded     BOOLEAN DEFAULT FALSE;
