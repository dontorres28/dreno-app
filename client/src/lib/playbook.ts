import { supabase } from './supabase';

export interface PlaybookNote {
  id: string; section: string; body: string; created_at: string;
  first_viewed_at: string | null; coach_id: string;
  coach_name: string | null; coach_photo: string | null; eligible_for_animation: boolean;
}

// Athlete's own playbook. RLS: p_pb_ath (own notes), p_profiles_booking_read (coach name),
// p_coach_verified_read (coach photo). Mirrors the old /api/playbook join, client-side.
export async function fetchPlaybook(): Promise<PlaybookNote[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];

  const { data: notes } = await supabase.from('playbook_notes')
    .select('id, section, body, created_at, updated_at, first_viewed_at, coach_id')
    .eq('athlete_id', uid).order('created_at', { ascending: false });
  if (!notes?.length) return [];

  const coachIds = [...new Set(notes.map(n => n.coach_id))];
  const [{ data: profs }, { data: coaches }, { data: completed }] = await Promise.all([
    supabase.from('profiles').select('id, name').in('id', coachIds),
    supabase.from('coaches').select('id, photo_url').in('id', coachIds),
    supabase.from('bookings').select('coach_id').eq('athlete_id', uid).eq('status', 'completed'),
  ]);
  const nameById = new Map((profs ?? []).map(p => [p.id, p.name]));
  const photoById = new Map((coaches ?? []).map(c => [c.id, c.photo_url]));
  const withSession = new Set((completed ?? []).map(b => b.coach_id));

  return notes.map(n => ({
    ...n,
    coach_name: nameById.get(n.coach_id) ?? null,
    coach_photo: photoById.get(n.coach_id) ?? null,
    eligible_for_animation: withSession.has(n.coach_id),
  })) as PlaybookNote[];
}

// Set first_viewed_at once, never overwrite. RLS p_pb_ath covers the athlete's own rows.
export async function markNoteSeen(noteId: string) {
  const { data: note } = await supabase.from('playbook_notes')
    .select('first_viewed_at').eq('id', noteId).single();
  if (note && !note.first_viewed_at) {
    await supabase.from('playbook_notes')
      .update({ first_viewed_at: new Date().toISOString() }).eq('id', noteId);
  }
}

// Coach adds a note for a booked athlete. RLS p_pb_coach_ins requires coach_id = me.
export async function addCoachNote(athleteId: string, section: string, body: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error('Not signed in');
  const valid = ['general', 'focus', 'pre-performance', 'resilience', 'identity', 'recovery'];
  const { data, error } = await supabase.from('playbook_notes').insert({
    athlete_id: athleteId, coach_id: uid,
    section: valid.includes(section) ? section : 'general', body: body.trim(),
  }).select().single();
  if (error) throw error;
  return data;
}
