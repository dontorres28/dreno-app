-- 013: make the signed-in `administrator` role work directly against Neon.
-- Creates the org membership tables (never existed in any schema) + admin RLS.
-- Additive/idempotent. is_admin() is SECURITY DEFINER over public.administrators.

-- ── Org membership (inferred from the old server's usage) ────────────────────
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     TEXT NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  athlete_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at  TIMESTAMPTZ,
  UNIQUE (org_id, email)
);
CREATE TABLE IF NOT EXISTS public.org_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     TEXT NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  coach_id   TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at  TIMESTAMPTZ,
  UNIQUE (org_id, email)
);
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_orgmem_admin ON public.org_members;
CREATE POLICY p_orgmem_admin ON public.org_members FOR ALL
  USING (org_id = auth.user_id()) WITH CHECK (org_id = auth.user_id());
DROP POLICY IF EXISTS p_orgmem_self ON public.org_members;
CREATE POLICY p_orgmem_self ON public.org_members FOR SELECT USING (athlete_id = auth.user_id());

DROP POLICY IF EXISTS p_orgcoach_admin ON public.org_coaches;
CREATE POLICY p_orgcoach_admin ON public.org_coaches FOR ALL
  USING (org_id = auth.user_id()) WITH CHECK (org_id = auth.user_id());
DROP POLICY IF EXISTS p_orgcoach_self ON public.org_coaches;
CREATE POLICY p_orgcoach_self ON public.org_coaches FOR SELECT USING (coach_id = auth.user_id());

-- ── Admin platform powers (coach verification, flags, derived stats) ─────────
DROP POLICY IF EXISTS p_coach_admin_update ON public.coaches;
CREATE POLICY p_coach_admin_update ON public.coaches FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_sf_admin ON public.session_feedback;
CREATE POLICY p_sf_admin ON public.session_feedback FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS p_rebook_admin_write ON public.coach_rebook_stats;
CREATE POLICY p_rebook_admin_write ON public.coach_rebook_stats FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_agg_admin_write ON public.coach_check_in_aggregate;
CREATE POLICY p_agg_admin_write ON public.coach_check_in_aggregate FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_coaches TO authenticated;
