-- Playbook notes: coach writes notes per athlete, grouped by section
-- first_viewed_at is null until the athlete first renders the note — triggers the signature animation

CREATE TABLE IF NOT EXISTS public.playbook_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'general'
    CHECK (section IN ('general','focus','pre-performance','resilience','identity','recovery')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  first_viewed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS playbook_notes_athlete_idx ON public.playbook_notes(athlete_id);
CREATE INDEX IF NOT EXISTS playbook_notes_coach_idx ON public.playbook_notes(coach_id);

ALTER TABLE public.playbook_notes ENABLE ROW LEVEL SECURITY;

-- Athlete can read their own notes
CREATE POLICY "athlete_read_own_playbook"
  ON public.playbook_notes FOR SELECT
  USING (athlete_id = auth.uid());

-- Coach can read/write notes they authored
CREATE POLICY "coach_read_own_playbook"
  ON public.playbook_notes FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "coach_insert_playbook"
  ON public.playbook_notes FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_update_playbook"
  ON public.playbook_notes FOR UPDATE
  USING (coach_id = auth.uid());

-- Service role can do anything (for server-side mark-seen)
