-- Seed data for Dreno
-- NOTE: You must create auth users first via Supabase Auth (Dashboard or API)
-- before running this seed. The UUIDs below must match real auth.users rows.
--
-- Step 1: Go to Supabase Dashboard > Authentication > Users > Add User
-- Create these users:
--   coach1@dreno.app  password: DrEN0seed1!
--   coach2@dreno.app  password: DrEN0seed2!
--   athlete1@dreno.app  password: DrEN0seed3!
--
-- Step 2: Copy the UUIDs from the auth.users table and replace the placeholders below.
-- Step 3: Run this SQL in the Supabase SQL editor.

-- Replace these with real auth user UUIDs:
DO $$
DECLARE
  coach1_id UUID := '00000000-0000-0000-0000-000000000001';
  coach2_id UUID := '00000000-0000-0000-0000-000000000002';
  athlete1_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN

  INSERT INTO public.profiles (id, role, name, email) VALUES
    (coach1_id, 'coach', 'Marco Ferretti', 'coach1@dreno.app'),
    (coach2_id, 'coach', 'Sana Lindqvist', 'coach2@dreno.app'),
    (athlete1_id, 'athlete', 'Alex Nowak', 'athlete1@dreno.app')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.coaches (id, headline, bio, expertise_tags, credentials, hourly_rate, verified_status, sports, onboarded) VALUES
    (
      coach1_id,
      'Focus and composure for contact sports',
      'Ten years working with ice hockey, rugby, and combat sports athletes at national and club levels. My work centers on what happens in the two seconds before you act: the read, the decision, the follow-through. No scripts, no programs. Just the real thing.',
      ARRAY['focus','composure','pre-performance','team-dynamics'],
      'MSc Sport Psychology, University of Bern. Certified by Swiss Olympic Association.',
      120,
      'verified',
      ARRAY['ice hockey','rugby','boxing'],
      true
    ),
    (
      coach2_id,
      'Endurance and individual sport performance',
      'Former Swedish national swimmer turned coach. I work with individual sport athletes who carry everything themselves: the training, the pressure, the results. My approach is direct and data-informed.',
      ARRAY['confidence','pressure-management','identity','goal-setting'],
      'BSc Psychology, Lund University. BASES-accredited practitioner.',
      95,
      'verified',
      ARRAY['swimming','cycling','athletics','triathlon'],
      true
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.athletes (id, sport, competition_level, timezone, session_format_pref, onboarded) VALUES
    (athlete1_id, 'ice hockey', 'club', 'Europe/Zurich', 'video', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.availability (coach_id, day_of_week, start_time, end_time) VALUES
    (coach1_id, 'monday', '09:00', '12:00'),
    (coach1_id, 'wednesday', '14:00', '18:00'),
    (coach1_id, 'friday', '09:00', '12:00'),
    (coach2_id, 'tuesday', '08:00', '12:00'),
    (coach2_id, 'thursday', '13:00', '17:00')
  ON CONFLICT DO NOTHING;

END $$;
