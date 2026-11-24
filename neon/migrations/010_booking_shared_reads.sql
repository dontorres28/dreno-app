-- 010: let each party in a booking read the other's profile name, and let a coach
-- read a booked athlete's drills/feedback (powers playbook coach names, coach roster,
-- Signal, check-in aggregate — all client-side, no server). Additive, idempotent.

DROP POLICY IF EXISTS p_profiles_booking_read ON public.profiles;
CREATE POLICY p_profiles_booking_read ON public.profiles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE (b.athlete_id = auth.user_id() AND b.coach_id = profiles.id)
     OR (b.coach_id   = auth.user_id() AND b.athlete_id = profiles.id)
));

DROP POLICY IF EXISTS p_drill_coach_read ON public.drill_results;
CREATE POLICY p_drill_coach_read ON public.drill_results FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.coach_id = auth.user_id() AND b.athlete_id = drill_results.athlete_id
    AND b.status IN ('confirmed','completed')
));

DROP POLICY IF EXISTS p_sf_coach_read ON public.session_feedback;
CREATE POLICY p_sf_coach_read ON public.session_feedback FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.coach_id = auth.user_id() AND b.athlete_id = session_feedback.athlete_id
    AND b.status IN ('confirmed','completed')
));
