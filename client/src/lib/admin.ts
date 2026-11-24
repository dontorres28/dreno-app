import { supabase } from './supabase';

// All of these run as the signed-in administrator. RLS: p_*_admin (SELECT via is_admin),
// p_coach_admin_update (verify/reject), p_sf_admin (flags), p_orgmem/coach_admin (org).

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error('Not signed in');
  return data.user.id;
}

// ── Coach verification ──────────────────────────────────────────────────────
export async function listCoaches() {
  const { data, error } = await supabase.from('coaches')
    .select('id, headline, verified_status, rejection_reason, profiles(name, email)')
    .order('verified_status');
  if (error) throw error;
  return data ?? [];
}
export async function verifyCoach(id: string) {
  const { error } = await supabase.from('coaches')
    .update({ verified_status: 'verified', rejection_reason: null }).eq('id', id);
  if (error) throw error;
}
export async function rejectCoach(id: string, reason: string) {
  const { error } = await supabase.from('coaches')
    .update({ verified_status: 'rejected', rejection_reason: reason || '' }).eq('id', id);
  if (error) throw error;
}

// ── Flags (coaches with admin-noted feedback in the last 90 days) ────────────
export async function getFlags() {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: flags, error } = await supabase.from('session_feedback')
    .select('id, coach_id, athlete_id, admin_note, created_at')
    .not('admin_note', 'is', null).gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const byCoach: Record<string, { coach_id: string; count: number; notes: { note: string; at: string }[]; name?: string | null }> = {};
  for (const f of flags ?? []) {
    (byCoach[f.coach_id] ??= { coach_id: f.coach_id, count: 0, notes: [] });
    byCoach[f.coach_id].count++;
    byCoach[f.coach_id].notes.push({ note: f.admin_note, at: f.created_at });
  }
  const ids = Object.keys(byCoach);
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, name').in('id', ids);
    for (const p of profs ?? []) if (byCoach[p.id]) byCoach[p.id].name = p.name;
  }
  return Object.values(byCoach).sort((a, b) => b.count - a.count);
}

// ── Recompute derived coach stats (rebook rate + 30d check-in aggregate) ─────
export async function recomputeStats() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 86400000);
  const { data: bookings } = await supabase.from('bookings')
    .select('coach_id, athlete_id, starts_at, status').eq('status', 'completed')
    .order('starts_at', { ascending: true });

  const byCoach: Record<string, any[]> = {};
  for (const b of bookings ?? []) (byCoach[b.coach_id] ??= []).push(b);

  const rebookRows = Object.entries(byCoach).map(([coach_id, sessions]) => {
    const byAthlete: Record<string, Date[]> = {};
    for (const s of sessions) (byAthlete[s.athlete_id] ??= []).push(new Date(s.starts_at));
    let first60 = 0, rebooked = 0;
    for (const dates of Object.values(byAthlete)) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      if (dates[0] < cutoff) { first60++; if (dates.length > 1) rebooked++; }
    }
    return {
      coach_id, sessions_total: sessions.length,
      athletes_first_60d_plus: first60, athletes_rebooked: rebooked,
      rebook_rate: first60 >= 10 ? Math.round((rebooked / first60) * 100) : null,
      updated_at: now.toISOString(),
    };
  });
  if (rebookRows.length) await supabase.from('coach_rebook_stats').upsert(rebookRows, { onConflict: 'coach_id' });

  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const { data: feedback } = await supabase.from('session_feedback')
    .select('coach_id, useful, mood').gte('created_at', since30).not('useful', 'is', null);
  const agg: Record<string, { yes: number; sort_of: number; no: number; moods: number[] }> = {};
  for (const f of feedback ?? []) {
    (agg[f.coach_id] ??= { yes: 0, sort_of: 0, no: 0, moods: [] });
    agg[f.coach_id][f.useful === 'yes' ? 'yes' : f.useful === 'sort_of' ? 'sort_of' : 'no']++;
    if (f.mood) agg[f.coach_id].moods.push(f.mood);
  }
  const aggRows = Object.entries(agg).map(([coach_id, d]) => {
    const total = d.yes + d.sort_of + d.no;
    return {
      coach_id,
      useful_rate_30d: total > 0 ? Math.round((d.yes / total) * 100) : null,
      mood_avg_30d: d.moods.length ? +(d.moods.reduce((a, b) => a + b, 0) / d.moods.length).toFixed(1) : null,
      response_count_30d: total, updated_at: now.toISOString(),
    };
  });
  if (aggRows.length) await supabase.from('coach_check_in_aggregate').upsert(aggRows, { onConflict: 'coach_id' });
  return { coaches: rebookRows.length, aggregates: aggRows.length };
}

// ── Org overview + invites (admin manages their own org_id rows) ─────────────
export async function getOrgOverview() {
  const me = await uid();
  const [{ data: org, error: oErr }, { data: members }, { data: rawCoaches }] = await Promise.all([
    supabase.from('administrators').select('*').eq('id', me).single(),
    supabase.from('org_members').select('id, email, status, athlete_id, invited_at, joined_at').eq('org_id', me),
    supabase.from('org_coaches').select('id, email, coach_id, status, invited_at, joined_at').eq('org_id', me),
  ]);
  if (oErr) throw new Error('Not an admin account');

  const coachIds = (rawCoaches ?? []).filter(c => c.coach_id).map(c => c.coach_id);
  const names: Record<string, string | null> = {};
  if (coachIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, name').in('id', coachIds);
    for (const p of profs ?? []) names[p.id] = p.name;
  }
  const coaches = (rawCoaches ?? []).map(c => ({ ...c, name: c.coach_id ? names[c.coach_id] ?? null : null }));
  const mem = members ?? [];
  return {
    org,
    stats: { total: mem.length, active: mem.filter(m => m.status === 'active').length, pending: mem.filter(m => m.status === 'pending').length },
    members: mem, coaches,
  };
}

async function invite(table: 'org_members' | 'org_coaches', idCol: 'athlete_id' | 'coach_id', email: string, requireCoach: boolean) {
  const me = await uid();
  const lower = email.trim().toLowerCase();
  if (!lower.includes('@')) throw new Error('Valid email required');
  const { data: existing } = await supabase.from(table).select('id').eq('org_id', me).eq('email', lower).maybeSingle();
  if (existing) throw new Error('Already invited');
  let q = supabase.from('profiles').select('id').eq('email', lower);
  if (requireCoach) q = q.eq('role', 'coach');
  const { data: profile } = await q.maybeSingle();
  const { data, error } = await supabase.from(table).insert({
    org_id: me, email: lower, [idCol]: profile?.id ?? null,
    status: profile ? 'active' : 'pending',
    ...(profile ? { joined_at: new Date().toISOString() } : {}),
  }).select().single();
  if (error) throw error;
  return { invite: data, already_registered: !!profile };
}
export const inviteAthlete = (email: string) => invite('org_members', 'athlete_id', email, false);
export const inviteCoachToOrg = (email: string) => invite('org_coaches', 'coach_id', email, true);

export async function removeMember(id: string) {
  const me = await uid();
  const { error } = await supabase.from('org_members').delete().eq('id', id).eq('org_id', me);
  if (error) throw error;
}
export async function removeOrgCoach(id: string) {
  const me = await uid();
  const { error } = await supabase.from('org_coaches').delete().eq('id', id).eq('org_id', me);
  if (error) throw error;
}
