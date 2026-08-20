CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles (one per auth user)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete','coach')),
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- athletes
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sport TEXT,
  competition_level TEXT,
  timezone TEXT,
  session_format_pref TEXT,
  onboarded BOOLEAN DEFAULT FALSE
);

-- coaches
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  expertise_tags TEXT[] DEFAULT '{}',
  credentials TEXT,
  linkedin_url TEXT,
  hourly_rate INTEGER,
  verified_status TEXT DEFAULT 'pending' CHECK (verified_status IN ('pending','verified','rejected')),
  stripe_account_id TEXT,
  photo_url TEXT,
  sports TEXT[] DEFAULT '{}',
  rejection_reason TEXT,
  onboarded BOOLEAN DEFAULT FALSE
);

-- athlete challenge tags (ranked top challenges)
CREATE TABLE public.athlete_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  challenge_tag TEXT NOT NULL,
  rank INTEGER NOT NULL
);

-- availability slots
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE
);

-- bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  availability_id UUID REFERENCES public.availability(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  duration_min INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  commission_cents INTEGER NOT NULL DEFAULT 0,
  room_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- sessions (notes per booking)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  athlete_id UUID REFERENCES public.profiles(id),
  coach_id UUID REFERENCES public.profiles(id),
  coach_notes TEXT,
  athlete_notes TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horizon TEXT CHECK (horizon IN ('short','mid','long')),
  title TEXT NOT NULL,
  smart_detail TEXT,
  status TEXT DEFAULT 'active',
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- journal entries
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT,
  shared_with_coach BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- athlete longitudinal records (append-only)
CREATE TABLE public.athlete_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT,
  signal_type TEXT,
  value JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete reads own" ON public.athletes FOR ALL USING (id = auth.uid());

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach reads own" ON public.coaches FOR ALL USING (id = auth.uid());
CREATE POLICY "anyone reads verified coaches" ON public.coaches FOR SELECT USING (verified_status = 'verified');

ALTER TABLE public.athlete_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete manages own challenges" ON public.athlete_challenges FOR ALL USING (athlete_id = auth.uid());

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaches manage own availability" ON public.availability FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "anyone reads availability" ON public.availability FOR SELECT USING (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athletes read own bookings" ON public.bookings FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "coaches read own bookings" ON public.bookings FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "athletes insert bookings" ON public.bookings FOR INSERT WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "athletes update own bookings" ON public.bookings FOR UPDATE USING (athlete_id = auth.uid());

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read sessions" ON public.sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.athlete_id = auth.uid() OR b.coach_id = auth.uid()))
);
CREATE POLICY "participants write sessions" ON public.sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.athlete_id = auth.uid() OR b.coach_id = auth.uid()))
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete manages own goals" ON public.goals FOR ALL USING (athlete_id = auth.uid());

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete manages own journal" ON public.journal_entries FOR ALL USING (athlete_id = auth.uid());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = thread_id AND (b.athlete_id = auth.uid() OR b.coach_id = auth.uid())
  )
);
CREATE POLICY "users send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

ALTER TABLE public.athlete_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete reads own records" ON public.athlete_records FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "coaches read records for booked athletes" ON public.athlete_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.athlete_id = athlete_records.athlete_id AND b.coach_id = auth.uid() AND b.status = 'confirmed')
);
