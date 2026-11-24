-- 011: let a coach read a booked athlete's hub data (athlete row, goals, shared journal).
-- Scoped to a booking relationship. Additive, idempotent. Powers the coach athlete hub client-side.

DROP POLICY IF EXISTS p_ath_coach_read ON public.athletes;
CREATE POLICY p_ath_coach_read ON public.athletes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.coach_id = auth.user_id() AND b.athlete_id = athletes.id
));

DROP POLICY IF EXISTS p_goals_coach_read ON public.goals;
CREATE POLICY p_goals_coach_read ON public.goals FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.coach_id = auth.user_id() AND b.athlete_id = goals.athlete_id
));

DROP POLICY IF EXISTS p_journal_coach_read ON public.journal_entries;
CREATE POLICY p_journal_coach_read ON public.journal_entries FOR SELECT
USING (shared_with_coach = true AND EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.coach_id = auth.user_id() AND b.athlete_id = journal_entries.athlete_id
));
