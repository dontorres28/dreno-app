-- 012: verified coaches are marketplace-public, so any signed-in user can read their
-- profile row (needed for the Coaches browse + CoachProfile name before a booking exists).
-- Follow-up: denormalize coach display name onto public.coaches so email isn't exposed here.
DROP POLICY IF EXISTS p_profiles_verified_coach_read ON public.profiles;
CREATE POLICY p_profiles_verified_coach_read ON public.profiles FOR SELECT
USING (role = 'coach' AND EXISTS (
  SELECT 1 FROM public.coaches c WHERE c.id = profiles.id AND c.verified_status = 'verified'
));
