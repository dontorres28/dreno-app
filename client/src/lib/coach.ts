import { supabase } from './supabase';

// Roster: every athlete the coach has a booking with. RLS: p_profiles_booking_read (name),
// p_ath_coach_read (sport/level). country/languages/birth_date lived in auth user_metadata,
// which the browser can't read for other users — they degrade to null until moved into `athletes`.
export async function listCoachAthletes() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];
  const { data: bookings } = await supabase.from('bookings')
    .select('athlete_id, status, starts_at')
    .eq('coach_id', uid).in('status', ['confirmed', 'completed', 'pending']);
  const ids = [...new Set((bookings ?? []).map(b => b.athlete_id))];
  if (!ids.length) return [];

  const [{ data: profs }, { data: aths }] = await Promise.all([
    supabase.from('profiles').select('id, name, email').in('id', ids),
    supabase.from('athletes').select('id, sport, competition_level').in('id', ids),
  ]);
  const athById = Object.fromEntries((aths ?? []).map(a => [a.id, a]));
  const latest: Record<string, any> = {};
  for (const b of bookings!) {
    if (!latest[b.athlete_id] || b.starts_at > latest[b.athlete_id].starts_at) latest[b.athlete_id] = b;
  }
  return (profs ?? []).map(p => ({
    id: p.id, name: p.name, email: p.email,
    sport: athById[p.id]?.sport ?? null,
    competition_level: athById[p.id]?.competition_level ?? null,
    country: null, languages: [], birth_date: null,
    latest_booking_status: latest[p.id]?.status ?? null,
    latest_booking_at: latest[p.id]?.starts_at ?? null,
  }));
}

// Athlete hub detail. RLS: coach-read-if-booked policies (010 + 011) cover every table here.
export async function getCoachAthlete(athleteId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error('Not signed in');

  const { data: rel } = await supabase.from('bookings')
    .select('id').eq('coach_id', uid).eq('athlete_id', athleteId).limit(1);
  if (!rel?.length) throw new Error('No booking relationship');

  const [profile, athlete, goals, journal, drills, bookings, coachNotes] = await Promise.all([
    supabase.from('profiles').select('id, name, email').eq('id', athleteId).single(),
    supabase.from('athletes').select('*').eq('id', athleteId).single(),
    supabase.from('goals').select('*').eq('athlete_id', athleteId).eq('status', 'active').order('created_at'),
    supabase.from('journal_entries').select('id, body, created_at').eq('athlete_id', athleteId).eq('shared_with_coach', true).order('created_at', { ascending: false }).limit(10),
    supabase.from('drill_results').select('drill_type, composite_score, completed_at').eq('athlete_id', athleteId).order('completed_at', { ascending: false }).limit(30),
    supabase.from('bookings').select('id, starts_at, status, ends_at').eq('coach_id', uid).eq('athlete_id', athleteId).order('starts_at', { ascending: false }),
    supabase.from('playbook_notes').select('id, section, body, created_at').eq('athlete_id', athleteId).eq('coach_id', uid).order('created_at', { ascending: false }),
  ]);

  return {
    profile: profile.data,
    athlete: athlete.data,
    goals: goals.data ?? [],
    journal: journal.data ?? [],
    drills: drills.data ?? [],
    bookings: bookings.data ?? [],
    coachNotes: coachNotes.data ?? [],
  };
}

// Coach's own 30-day feedback aggregate (RLS p_agg_coach). Null until the aggregate job runs.
export async function getCheckInAggregate() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;
  const { data } = await supabase.from('coach_check_in_aggregate').select('*').eq('coach_id', uid).maybeSingle();
  return data ?? null;
}

// Public rebook stats for a coach profile (RLS p_rebook_read = true).
export async function getRebookStats(coachId: string) {
  const { data } = await supabase.from('coach_rebook_stats').select('*').eq('coach_id', coachId).maybeSingle();
  return data ?? null;
}
