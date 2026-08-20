import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(express.json());
app.use(cors({ origin: process.env.APP_URL, credentials: true }));

// ---- Auth middleware ----
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ---- Admin middleware ----
function requireAdmin(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Jitsi room URL is deterministic from booking ID — no API call needed
function jitsiRoomUrl(bookingId) {
  return `https://meet.jit.si/dreno-${bookingId}`;
}

// ---- Create booking (athlete) ----
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { coachId, availabilityId, startsAt, durationMin, priceCents, notes } = req.body;
    if (!coachId || !startsAt) return res.status(400).json({ error: 'coachId and startsAt required' });

    const commissionCents = Math.round((priceCents || 0) * 0.25);

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        athlete_id: req.user.id,
        coach_id: coachId,
        availability_id: availabilityId || null,
        starts_at: startsAt,
        duration_min: durationMin || 60,
        price_cents: priceCents || 0,
        commission_cents: commissionCents,
        status: 'pending',
        ...(notes ? { athlete_notes: notes } : {}),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Mark slot as booked
    if (availabilityId) {
      await supabase.from('availability').update({ is_booked: true }).eq('id', availabilityId);
    }

    res.json(data);
  } catch (err) {
    console.error('create booking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Confirm booking (coach) ----
app.post('/api/bookings/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.coach_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not pending' });

    const roomUrl = jitsiRoomUrl(id);

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', room_url: roomUrl })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('confirm booking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Cancel booking (either party) ----
app.post('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !booking) return res.status(404).json({ error: 'Booking not found' });
    const isParticipant = booking.athlete_id === req.user.id || booking.coach_id === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (booking.availability_id) {
      await supabase.from('availability').update({ is_booked: false }).eq('id', booking.availability_id);
    }

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    console.error('cancel booking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Get/create room URL (idempotent) ----
app.post('/api/bookings/:id/create-room', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
    const isParticipant = booking.athlete_id === req.user.id || booking.coach_id === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    let roomUrl = booking.room_url || jitsiRoomUrl(id);
    if (!booking.room_url) {
      await supabase.from('bookings').update({ room_url: roomUrl }).eq('id', id);
    }

    res.json({ room_url: roomUrl });
  } catch (err) {
    console.error('create-room error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin ----
app.post('/api/admin/coaches/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('coaches')
      .update({ verified_status: 'verified', rejection_reason: null })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/coaches/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { error } = await supabase
      .from('coaches')
      .update({ verified_status: 'rejected', rejection_reason: reason || '' })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/coaches', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*, profiles(name, email)')
      .order('verified_status');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coach: athlete list ──────────────────────────────────────────────────────
app.get('/api/coach/athletes', requireAuth, async (req, res) => {
  try {
    // Get all athletes the coach has any booking with
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('athlete_id, status, starts_at')
      .eq('coach_id', req.user.id)
      .in('status', ['confirmed', 'completed', 'pending']);
    if (error) throw error;

    const athleteIds = [...new Set(bookings.map(b => b.athlete_id))];
    if (!athleteIds.length) return res.json([]);

    const [profilesRes, athletesRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email').in('id', athleteIds),
      supabase.from('athletes').select('id, sport, competition_level').in('id', athleteIds),
    ]);

    const athleteMap = Object.fromEntries((athletesRes.data ?? []).map(a => [a.id, a]));
    const statusMap = {};
    for (const b of bookings) {
      if (!statusMap[b.athlete_id] || b.starts_at > statusMap[b.athlete_id].starts_at) {
        statusMap[b.athlete_id] = b;
      }
    }

    // Get user_metadata for each athlete via admin API
    const metaMap = {};
    for (const id of athleteIds) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(id);
        metaMap[id] = user?.user_metadata ?? {};
      } catch { /* skip */ }
    }

    const result = (profilesRes.data ?? []).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      sport: athleteMap[p.id]?.sport ?? null,
      competition_level: athleteMap[p.id]?.competition_level ?? null,
      country: metaMap[p.id]?.country ?? null,
      languages: metaMap[p.id]?.languages ?? [],
      birth_date: metaMap[p.id]?.birth_date ?? null,
      latest_booking_status: statusMap[p.id]?.status ?? null,
      latest_booking_at: statusMap[p.id]?.starts_at ?? null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coach: athlete hub detail ────────────────────────────────────────────────
app.get('/api/coach/athletes/:id', requireAuth, async (req, res) => {
  const athleteId = req.params.id;
  try {
    // Verify coach has a booking with this athlete
    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('coach_id', req.user.id)
      .eq('athlete_id', athleteId)
      .limit(1)
      .single();
    if (bookErr || !booking) return res.status(403).json({ error: 'No booking relationship' });

    const [profileRes, athleteRes, goalsRes, journalRes, drillsRes, bookingsRes, notesRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email').eq('id', athleteId).single(),
      supabase.from('athletes').select('*').eq('id', athleteId).single(),
      supabase.from('goals').select('*').eq('athlete_id', athleteId).eq('status', 'active').order('created_at'),
      supabase.from('journal_entries').select('id, body, created_at').eq('athlete_id', athleteId).eq('shared_with_coach', true).order('created_at', { ascending: false }).limit(10),
      supabase.from('drill_results').select('drill_type, composite_score, completed_at').eq('athlete_id', athleteId).order('completed_at', { ascending: false }).limit(30),
      supabase.from('bookings').select('id, starts_at, status, ends_at').eq('coach_id', req.user.id).eq('athlete_id', athleteId).order('starts_at', { ascending: false }),
      supabase.from('playbook_notes').select('id, section, body, created_at').eq('athlete_id', athleteId).eq('coach_id', req.user.id).order('created_at', { ascending: false }),
    ]);

    let meta = {};
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(athleteId);
      meta = user?.user_metadata ?? {};
    } catch { /* skip */ }

    res.json({
      profile: { ...profileRes.data, ...meta },
      athlete: athleteRes.data,
      goals: goalsRes.data ?? [],
      journal: journalRes.data ?? [],
      drills: drillsRes.data ?? [],
      bookings: bookingsRes.data ?? [],
      coachNotes: notesRes.data ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Session feedback (athlete submits post-session check-in) ──────────────────
app.post('/api/session-feedback', requireAuth, async (req, res) => {
  try {
    const { booking_id, useful, mood, admin_note } = req.body;
    const athlete_id = req.user.id;
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' });

    // Verify booking belongs to this athlete and is completed
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, coach_id, status')
      .eq('id', booking_id)
      .eq('athlete_id', athlete_id)
      .single();
    if (bErr || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Session not completed' });

    // Upsert feedback (athlete can only submit once per booking)
    const { error } = await supabase.from('session_feedback').upsert({
      booking_id,
      athlete_id,
      coach_id: booking.coach_id,
      useful: useful || null,
      mood: mood || null,
      admin_note: admin_note || null,
    }, { onConflict: 'booking_id,athlete_id' });
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coach rebook stats (public read) ──────────────────────────────────────────
app.get('/api/coach/:id/rebook-stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coach_rebook_stats')
      .select('*')
      .eq('coach_id', req.params.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data ?? null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coach check-in aggregate (coach reads own) ────────────────────────────────
app.get('/api/coach/check-in-aggregate', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coach_check_in_aggregate')
      .select('*')
      .eq('coach_id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data ?? null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: flags queue ─────────────────────────────────────────────────────────
app.get('/api/admin/flags', requireAdmin, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const { data: flags, error } = await supabase
      .from('session_feedback')
      .select('id, coach_id, athlete_id, admin_note, created_at, bookings(starts_at)')
      .not('admin_note', 'is', null)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Group by coach and count flags
    const coachMap = {};
    for (const f of flags) {
      if (!coachMap[f.coach_id]) coachMap[f.coach_id] = { coach_id: f.coach_id, count: 0, notes: [] };
      coachMap[f.coach_id].count++;
      coachMap[f.coach_id].notes.push({ note: f.admin_note, at: f.created_at });
    }

    // Fetch coach names
    const coachIds = Object.keys(coachMap);
    if (coachIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', coachIds);
      for (const p of (profiles ?? [])) {
        if (coachMap[p.id]) coachMap[p.id].name = p.name;
      }
    }

    const result = Object.values(coachMap).sort((a, b) => b.count - a.count);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: recompute all coach stats ──────────────────────────────────────────
app.post('/api/admin/recompute-stats', requireAdmin, async (req, res) => {
  try {
    // Fetch all completed bookings
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('id, coach_id, athlete_id, starts_at, status')
      .eq('status', 'completed')
      .order('starts_at', { ascending: true });
    if (bErr) throw bErr;

    const now = new Date();
    const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

    // ── Rebook stats per coach ──
    const coachBookings = {};
    for (const b of (bookings ?? [])) {
      if (!coachBookings[b.coach_id]) coachBookings[b.coach_id] = [];
      coachBookings[b.coach_id].push(b);
    }

    const rebookRows = [];
    for (const [coach_id, sessions] of Object.entries(coachBookings)) {
      // Group by athlete
      const athleteSessions = {};
      for (const s of sessions) {
        if (!athleteSessions[s.athlete_id]) athleteSessions[s.athlete_id] = [];
        athleteSessions[s.athlete_id].push(new Date(s.starts_at));
      }

      let firstSessions60d = 0;
      let rebooked = 0;
      for (const [, dates] of Object.entries(athleteSessions)) {
        dates.sort((a, b) => a - b);
        const first = dates[0];
        if (first < cutoff) {
          firstSessions60d++;
          // Did they have a second session with this coach?
          if (dates.length > 1) rebooked++;
        }
      }

      const rebook_rate = firstSessions60d >= 10
        ? Math.round((rebooked / firstSessions60d) * 100)
        : null;

      rebookRows.push({
        coach_id,
        sessions_total: sessions.length,
        athletes_first_60d_plus: firstSessions60d,
        athletes_rebooked: rebooked,
        rebook_rate,
        updated_at: now.toISOString(),
      });
    }

    if (rebookRows.length > 0) {
      await supabase.from('coach_rebook_stats').upsert(rebookRows, { onConflict: 'coach_id' });
    }

    // ── Check-in aggregate per coach (rolling 30 days) ──
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: feedback, error: fErr } = await supabase
      .from('session_feedback')
      .select('coach_id, useful, mood')
      .gte('created_at', since30.toISOString())
      .not('useful', 'is', null);
    if (fErr) throw fErr;

    const aggMap = {};
    for (const f of (feedback ?? [])) {
      if (!aggMap[f.coach_id]) aggMap[f.coach_id] = { yes: 0, sort_of: 0, no: 0, moods: [] };
      aggMap[f.coach_id][f.useful === 'yes' ? 'yes' : f.useful === 'sort_of' ? 'sort_of' : 'no']++;
      if (f.mood) aggMap[f.coach_id].moods.push(f.mood);
    }

    const aggRows = [];
    for (const [coach_id, d] of Object.entries(aggMap)) {
      const total = d.yes + d.sort_of + d.no;
      aggRows.push({
        coach_id,
        useful_rate_30d: total > 0 ? Math.round((d.yes / total) * 100) : null,
        mood_avg_30d: d.moods.length > 0 ? +(d.moods.reduce((a, b) => a + b, 0) / d.moods.length).toFixed(1) : null,
        response_count_30d: total,
        updated_at: now.toISOString(),
      });
    }

    if (aggRows.length > 0) {
      await supabase.from('coach_check_in_aggregate').upsert(aggRows, { onConflict: 'coach_id' });
    }

    res.json({ ok: true, coaches: rebookRows.length, aggregates: aggRows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Athlete: check if feedback already submitted for a booking ─────────────────
app.get('/api/session-feedback/:bookingId', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('session_feedback')
      .select('id, useful, mood')
      .eq('booking_id', req.params.bookingId)
      .eq('athlete_id', req.user.id)
      .single();
    res.json(data ?? null);
  } catch {
    res.json(null);
  }
});

// ── Athlete: recent feedback for at-risk nudge ────────────────────────────────
app.get('/api/athlete/recent-feedback', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('session_feedback')
      .select('useful, created_at')
      .eq('athlete_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(2);
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── The Signal ────────────────────────────────────────────────────────────────

async function fetchDayData(targetId, endDate) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - 90);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const [drillsRes, journalRes, bookingsRes, feedbackRes] = await Promise.all([
    supabase.from('drill_results').select('completed_at').eq('athlete_id', targetId)
      .gte('completed_at', start.toISOString()).lte('completed_at', end.toISOString()),
    supabase.from('journal_entries').select('created_at, body').eq('athlete_id', targetId)
      .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
    supabase.from('bookings').select('starts_at').eq('athlete_id', targetId).eq('status', 'completed')
      .gte('starts_at', start.toISOString()).lte('starts_at', end.toISOString()),
    supabase.from('session_feedback').select('mood, created_at').eq('athlete_id', targetId)
      .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
  ]);

  const toKey = (ts) => new Date(ts).toISOString().slice(0, 10);
  const buckets = {};

  for (const r of drillsRes.data ?? []) {
    const k = toKey(r.completed_at);
    if (!buckets[k]) buckets[k] = { drills: 0, journals: 0, sessions: 0, moods: [] };
    buckets[k].drills++;
  }
  for (const r of journalRes.data ?? []) {
    const k = toKey(r.created_at);
    if (!buckets[k]) buckets[k] = { drills: 0, journals: 0, sessions: 0, moods: [] };
    buckets[k].journals++;
    if (r.body) buckets[k].journals += r.body.length > 200 ? 0.5 : 0; // depth bonus
  }
  for (const r of bookingsRes.data ?? []) {
    const k = toKey(r.starts_at);
    if (!buckets[k]) buckets[k] = { drills: 0, journals: 0, sessions: 0, moods: [] };
    buckets[k].sessions++;
  }
  for (const r of feedbackRes.data ?? []) {
    const k = toKey(r.created_at);
    if (!buckets[k]) buckets[k] = { drills: 0, journals: 0, sessions: 0, moods: [] };
    if (r.mood != null) buckets[k].moods.push(r.mood);
  }

  // Build 90-day array: index 0 = oldest, 89 = newest
  const days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const b = buckets[k] || { drills: 0, journals: 0, sessions: 0, moods: [] };
    const mood = b.moods.length > 0 ? b.moods.reduce((a, v) => a + v, 0) / b.moods.length : null;
    days.push({ key: k, adherence: b.drills + b.journals + b.sessions, mood });
  }

  // Compute variability vs rolling 30-day mood baseline
  const moodVals = days.map(d => d.mood);
  for (let i = 0; i < days.length; i++) {
    const window = moodVals.slice(Math.max(0, i - 29), i + 1).filter(v => v != null);
    const baseline = window.length > 0 ? window.reduce((a, v) => a + v, 0) / window.length : 5;
    const m = days[i].mood ?? baseline;
    days[i].variability = Math.min(Math.abs(m - baseline) / 5, 1);
    days[i].tension = days[i].mood != null && days[i].mood <= 3;
    days[i].baseline = baseline;
  }

  return days;
}

function buildSignalSVG(days, ghostDays = null) {
  const W = 400, H = 560;
  const PAD_X = 56, PAD_Y = 32;
  const CX = W / 2;
  const DAY_H = (H - PAD_Y * 2) / 90;
  const MAX_HW = CX - PAD_X;
  const BONE = 'rgba(235,228,210,';

  function rowStr(i, d, fade = 1) {
    const adh = Math.min(d.adherence || 0, 5);
    const mood = d.mood != null ? d.mood : 5;
    const vari = d.variability || 0;
    const tension = d.tension || false;
    // index 89 = newest = top
    const y = PAD_Y + (89 - i) * DAY_H + DAY_H * 0.5;
    const sw = ((0.8 + (adh / 5) * 4.8) * fade).toFixed(2);
    const hw = 14 + (mood / 10) * MAX_HW;
    const baseA = adh === 0 ? 0.07 : 0.28 + (adh / 5) * 0.58;
    const alpha = Math.min(baseA * fade, 1).toFixed(3);
    const stroke = tension
      ? `rgba(255,48,64,${(0.8 * fade).toFixed(2)})`
      : `${BONE}${alpha})`;

    if (adh === 0) {
      return `<line x1="${(CX - 7).toFixed(1)}" y1="${y.toFixed(2)}" x2="${(CX + 7).toFixed(1)}" y2="${y.toFixed(2)}" stroke="${BONE}0.07)" stroke-width="0.4"/>`;
    }
    if (vari > 0.42) {
      const segs = 5;
      const segW = (hw * 2) / segs;
      const pts = Array.from({ length: segs + 1 }, (_, s) => {
        const sx = (CX - hw) + s * segW;
        const sy = y + Math.sin(i * 6.71 + s * 3.14) * vari * 3.2;
        return `${sx.toFixed(1)},${sy.toFixed(2)}`;
      }).join(' ');
      return `<polyline points="${pts}" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<line x1="${(CX - hw).toFixed(1)}" y1="${y.toFixed(2)}" x2="${(CX + hw).toFixed(1)}" y2="${y.toFixed(2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }

  const ghostLayer = ghostDays
    ? ghostDays.map((d, i) => rowStr(i, d, 0.18)).join('\n  ')
    : '';
  const mainLayer = days.map((d, i) => rowStr(i, d, 1)).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0D1B2A"/>
  <line x1="${CX.toFixed(1)}" y1="${PAD_Y}" x2="${CX.toFixed(1)}" y2="${H - PAD_Y}" stroke="rgba(235,228,210,0.05)" stroke-width="0.5"/>
  ${ghostLayer}
  ${mainLayer}
</svg>`;
}

app.get('/api/signal/:athleteId', requireAuth, async (req, res) => {
  const targetId = req.params.athleteId;
  const requesterId = req.user.id;

  if (requesterId !== targetId) {
    const { data: booking } = await supabase
      .from('bookings').select('id')
      .eq('coach_id', requesterId).eq('athlete_id', targetId)
      .in('status', ['confirmed', 'completed']).limit(1);
    if (!booking || booking.length === 0) return res.status(403).json({ error: 'Forbidden' });
  }

  const endDate = req.query.date ? new Date(req.query.date) : new Date();
  const showGhost = req.query.ghost === '1';

  try {
    const ghostEnd = showGhost ? new Date(endDate.getTime() - 30 * 86400000) : null;
    const [days, ghostDays] = await Promise.all([
      fetchDayData(targetId, endDate),
      showGhost ? fetchDayData(targetId, ghostEnd) : Promise.resolve(null),
    ]);

    const svg = buildSignalSVG(days, ghostDays);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (err) {
    console.error('signal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Signal: coach observation text ───────────────────────────────────────────
app.get('/api/signal/:athleteId/observation', requireAuth, async (req, res) => {
  const { athleteId } = req.params;
  const requesterId = req.user.id;
  if (requesterId === athleteId) return res.json({ text: null });

  const { data: booking } = await supabase
    .from('bookings').select('id')
    .eq('coach_id', requesterId).eq('athlete_id', athleteId)
    .in('status', ['confirmed', 'completed']).limit(1);
  if (!booking || booking.length === 0) return res.status(403).json({ error: 'Forbidden' });

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86400000);
  const [feedbackRes, drillsRes] = await Promise.all([
    supabase.from('session_feedback').select('mood, created_at').eq('athlete_id', athleteId)
      .gte('created_at', since30.toISOString()).order('created_at', { ascending: false }),
    supabase.from('drill_results').select('completed_at').eq('athlete_id', athleteId)
      .gte('completed_at', since30.toISOString()),
  ]);

  const feedback = feedbackRes.data ?? [];
  const drills = drillsRes.data ?? [];

  // Days since last any activity
  const allActivity = [...feedback.map(f => f.created_at), ...drills.map(d => d.completed_at)];
  const daysSinceLast = allActivity.length === 0 ? 30
    : Math.floor((now - new Date(Math.max(...allActivity.map(d => new Date(d))))) / 86400000);

  let text = null;

  if (daysSinceLast >= 11) {
    text = `Signal has flattened for ${daysSinceLast} days.`;
  } else {
    // Mood trend: last 7 vs prior 7
    const t7 = feedback.filter(f => new Date(f.created_at) > new Date(now - 7 * 86400000) && f.mood != null).map(f => f.mood);
    const p7 = feedback.filter(f => {
      const t = new Date(f.created_at).getTime();
      return t > now - 14 * 86400000 && t <= now - 7 * 86400000 && f.mood != null;
    }).map(f => f.mood);

    if (t7.length >= 2 && p7.length >= 2) {
      const t7avg = t7.reduce((a, v) => a + v, 0) / t7.length;
      const p7avg = p7.reduce((a, v) => a + v, 0) / p7.length;
      if (t7avg - p7avg > 1.5) text = 'Signal has widened this week.';
      else if (p7avg - t7avg > 1.5) text = 'Signal has narrowed this week.';
    }

    if (!text) {
      const tensionRecent = feedback.filter(f => f.mood != null && f.mood <= 3);
      if (tensionRecent.length > 0) {
        const since90 = new Date(now - 90 * 86400000);
        const { data: oldTension } = await supabase
          .from('session_feedback').select('id').eq('athlete_id', athleteId)
          .lte('mood', 3).lt('created_at', since30.toISOString())
          .gte('created_at', since90.toISOString()).limit(1);
        text = (oldTension && oldTension.length > 0)
          ? 'Red rows appearing after a gap.'
          : 'Low-signal rows appearing this week.';
      }
    }

    if (!text) {
      const uniqueDrillDays = new Set(drills.map(d => d.completed_at.slice(0, 10))).size;
      if (uniqueDrillDays >= 5) text = 'Consistent activity across the month.';
    }
  }

  res.json({ text: text ?? 'Not enough data to form an observation yet.' });
});

// ── Coach framework: generate bullets ────────────────────────────────────────
app.post('/api/coach/framework/generate', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { text, raw_text } = req.body;
  const inputText = (text || raw_text || '').trim();
  if (!inputText || inputText.length < 20) {
    return res.status(400).json({ error: 'Input too short.' });
  }

  // Rate limit: 3 calls per coach per day
  const today = new Date().toISOString().slice(0, 10);
  const { data: coach } = await supabase
    .from('coaches')
    .select('framework_generate_count, framework_generate_date')
    .eq('id', userId)
    .single();

  const sameDay = coach?.framework_generate_date === today;
  const count = sameDay ? (coach?.framework_generate_count ?? 0) : 0;
  if (count >= 3) {
    return res.status(429).json({ error: 'You have reached the limit of 3 generations today. Try again tomorrow.' });
  }

  // Basic content filter (profanity/safety placeholder — extend as needed)
  const BLOCKED = ['fuck', 'shit', 'bitch', 'asshole', 'nigger', 'kill yourself'];
  const lc = inputText.toLowerCase();
  if (BLOCKED.some(w => lc.includes(w))) {
    return res.status(400).json({ error: 'That did not go through. Try again in your own words.' });
  }

  // Anthropic API call
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'AI not configured.' });

  const prompt = `You are cleaning up a coach's description of how they work with athletes. Your job is to structure their input into bullet points that an athlete browsing coach profiles can scan quickly.

Rules, all mandatory:
- Output exactly 3 to 6 bullets. No more, no fewer.
- Each bullet is one sentence, under 20 words.
- Preserve the coach's meaning, do not add anything they did not say.
- Preserve specific techniques, methods, or phrases they name.
- Do not use em dashes. Use commas, periods, colons, or parentheses instead.
- Do not use these words: mindset, mental toughness, peak, elite, optimize, journey, wellness, balance, unlock, holistic, transformative, empower, unleash.
- Do not use motivational or marketing language. Plain, direct, factual.
- If the coach's input is vague, keep the output vague. Do not invent specifics.

Return JSON in the format: {"bullets": ["bullet one", "bullet two", ...]}.

Coach input:
${inputText}`;

  let bullets;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    const raw = data?.content?.[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.bullets) || parsed.bullets.length < 3 || parsed.bullets.length > 6) {
      throw new Error('Invalid bullet count');
    }
    bullets = parsed.bullets;
  } catch (err) {
    console.error('Framework generate error:', err);
    return res.status(502).json({ error: 'Generation failed. Try again.' });
  }

  // Update rate limit counters
  await supabase.from('coaches').update({
    framework_generate_count: count + 1,
    framework_generate_date: today,
  }).eq('id', userId);

  res.json({ bullets });
});

// ── Coach framework: save approved ───────────────────────────────────────────
app.post('/api/coach/framework/save', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { inputType, rawText, bullets } = req.body;
  if (!inputType || !rawText || !Array.isArray(bullets) || bullets.length < 1) {
    return res.status(400).json({ error: 'Missing fields.' });
  }
  await supabase.from('coaches').update({
    framework_input_type: inputType,
    framework_raw_text: rawText,
    framework_bullets: bullets,
    framework_updated_at: new Date().toISOString(),
  }).eq('id', userId);
  res.json({ ok: true });
});

// ── Playbook: athlete reads their notes (all sections) ───────────────────────
app.get('/api/playbook', requireAuth, async (req, res) => {
  const athleteId = req.user.id;
  try {
    const { data: notes, error } = await supabase
      .from('playbook_notes')
      .select('id, section, body, created_at, updated_at, first_viewed_at, coach_id')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Attach coach photo + first name
    const coachIds = [...new Set((notes ?? []).map(n => n.coach_id))];
    let coachMeta = {};
    if (coachIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', coachIds);
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id, photo_url')
        .in('id', coachIds);
      (profiles ?? []).forEach(p => { coachMeta[p.id] = { name: p.name }; });
      (coaches ?? []).forEach(c => { if (coachMeta[c.id]) coachMeta[c.id].photo_url = c.photo_url; });
    }

    // Check which coaches have at least one completed session with this athlete
    const { data: completedBookings } = await supabase
      .from('bookings')
      .select('coach_id')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed');
    const coachesWithSessions = new Set((completedBookings ?? []).map(b => b.coach_id));

    const result = (notes ?? []).map(n => ({
      ...n,
      coach_name: coachMeta[n.coach_id]?.name ?? null,
      coach_photo: coachMeta[n.coach_id]?.photo_url ?? null,
      eligible_for_animation: coachesWithSessions.has(n.coach_id),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Playbook: mark a note as seen (sets first_viewed_at once) ────────────────
app.post('/api/playbook/mark-seen', requireAuth, async (req, res) => {
  const athleteId = req.user.id;
  const { note_id } = req.body;
  if (!note_id) return res.status(400).json({ error: 'note_id required' });
  try {
    // Only set if still null — never overwrite an existing first_viewed_at
    const { data: note } = await supabase
      .from('playbook_notes')
      .select('athlete_id, first_viewed_at')
      .eq('id', note_id)
      .single();
    if (!note || note.athlete_id !== athleteId) return res.status(404).json({ error: 'Not found' });
    if (note.first_viewed_at) return res.json({ ok: true, already_seen: true });

    await supabase
      .from('playbook_notes')
      .update({ first_viewed_at: new Date().toISOString() })
      .eq('id', note_id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coach: add a playbook note for an athlete ────────────────────────────────
app.post('/api/coach/playbook/note', requireAuth, async (req, res) => {
  const coachId = req.user.id;
  const { athlete_id, section, body } = req.body;
  if (!athlete_id || !body?.trim()) return res.status(400).json({ error: 'athlete_id and body required' });
  const validSection = ['general','focus','pre-performance','resilience','identity','recovery'].includes(section)
    ? section : 'general';
  try {
    // Verify coach has a booking relationship
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('coach_id', coachId)
      .eq('athlete_id', athlete_id)
      .limit(1)
      .single();
    if (!booking) return res.status(403).json({ error: 'No booking relationship' });

    const { data, error } = await supabase
      .from('playbook_notes')
      .insert({ athlete_id, coach_id: coachId, section: validSection, body: body.trim() })
      .select()
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Administrator org endpoints ────────────────────────────────────────────

// GET /api/org/overview — dashboard stats
app.get('/api/org/overview', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.id;
    const [adminRes, membersRes, coachesRes] = await Promise.all([
      supabase.from('administrators').select('*').eq('id', orgId).single(),
      supabase.from('org_members').select('id, email, status, athlete_id, invited_at, joined_at').eq('org_id', orgId),
      supabase.from('org_coaches').select('id, email, coach_id, status, invited_at, joined_at').eq('org_id', orgId),
    ]);
    if (adminRes.error) return res.status(404).json({ error: 'Not an admin account' });
    const members = membersRes.data ?? [];
    const rawCoaches = coachesRes.data ?? [];

    // Enrich coaches with profile names
    const coachProfileIds = rawCoaches.filter(c => c.coach_id).map(c => c.coach_id);
    let profileNames = {};
    if (coachProfileIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', coachProfileIds);
      if (profiles) profiles.forEach(p => { profileNames[p.id] = p.name; });
    }
    const coaches = rawCoaches.map(c => ({ ...c, name: c.coach_id ? profileNames[c.coach_id] ?? null : null }));

    res.json({
      org: adminRes.data,
      stats: {
        total: members.length,
        active: members.filter(m => m.status === 'active').length,
        pending: members.filter(m => m.status === 'pending').length,
      },
      members,
      coaches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org/invite-coach
app.post('/api/org/invite-coach', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.id;
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

    const { data: admin } = await supabase.from('administrators').select('id').eq('id', orgId).single();
    if (!admin) return res.status(403).json({ error: 'Not an admin account' });

    const { data: existing } = await supabase.from('org_coaches').select('id').eq('org_id', orgId).eq('email', email.toLowerCase()).single();
    if (existing) return res.status(409).json({ error: 'Already invited' });

    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).eq('role', 'coach').single();

    const { data: invite, error } = await supabase.from('org_coaches').insert({
      org_id: orgId,
      email: email.toLowerCase(),
      coach_id: profile?.id ?? null,
      status: profile ? 'active' : 'pending',
      ...(profile ? { joined_at: new Date().toISOString() } : {}),
    }).select().single();
    if (error) throw error;

    res.json({ invite, already_registered: !!profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/org/coaches/:coachId
app.delete('/api/org/coaches/:coachId', requireAuth, async (req, res) => {
  try {
    const { coachId } = req.params;
    const { error } = await supabase.from('org_coaches').delete().eq('id', coachId).eq('org_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/org/invite — invite an athlete by email
app.post('/api/org/invite', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.id;
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

    // Check org exists
    const { data: admin } = await supabase.from('administrators').select('org_name, athlete_limit').eq('id', orgId).single();
    if (!admin) return res.status(403).json({ error: 'Not an admin account' });

    // Check if already invited
    const { data: existing } = await supabase.from('org_members').select('id, status').eq('org_id', orgId).eq('email', email.toLowerCase()).single();
    if (existing) return res.status(409).json({ error: 'Already invited', status: existing.status });

    // Check if athlete exists in profiles
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).single();

    const { data: invite, error } = await supabase.from('org_members').insert({
      org_id: orgId,
      email: email.toLowerCase(),
      athlete_id: profile?.id ?? null,
      status: profile ? 'active' : 'pending',
      ...(profile ? { joined_at: new Date().toISOString() } : {}),
    }).select().single();
    if (error) throw error;

    res.json({ invite, already_registered: !!profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/org/members/:memberId — remove a member
app.delete('/api/org/members/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { error } = await supabase.from('org_members').delete().eq('id', memberId).eq('org_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Passkey (WebAuthn) endpoints ─────────────────────────────────────────────
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const RP_NAME = 'Dreno';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

// POST /api/auth/passkey/register-options
app.post('/api/auth/passkey/register-options', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: profile } = await supabase.from('profiles').select('email, name').eq('id', userId).single();
    const { data: existingCreds } = await supabase.from('webauthn_credentials').select('credential_id').eq('user_id', userId);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: profile?.email ?? userId,
      userDisplayName: profile?.name ?? profile?.email ?? 'Dreno user',
      attestationType: 'none',
      excludeCredentials: (existingCreds ?? []).map(c => ({
        id: c.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await supabase.from('webauthn_challenges').insert({ challenge: options.challenge, user_id: userId });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/passkey/register-verify
app.post('/api/auth/passkey/register-verify', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: challengeRow } = await supabase
      .from('webauthn_challenges').select('challenge').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(1).single();
    if (!challengeRow) return res.status(400).json({ error: 'No challenge found' });

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credential } = verification.registrationInfo;
    await supabase.from('webauthn_credentials').insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      device_type: credential.deviceType,
      backed_up: credential.backedUp,
    });
    await supabase.from('webauthn_challenges').delete().eq('user_id', userId);
    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/passkey/login-options
app.post('/api/auth/passkey/login-options', async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials: [],
    });
    await supabase.from('webauthn_challenges').insert({ challenge: options.challenge });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/passkey/login-verify
app.post('/api/auth/passkey/login-verify', async (req, res) => {
  try {
    const { data: cred } = await supabase
      .from('webauthn_credentials').select('*').eq('credential_id', req.body.id).single();
    if (!cred) return res.status(400).json({ error: 'Passkey not recognized' });

    const { data: challengeRow } = await supabase
      .from('webauthn_challenges').select('*')
      .order('created_at', { ascending: false }).limit(1).single();
    if (!challengeRow) return res.status(400).json({ error: 'No challenge found' });

    const publicKeyBuffer = Buffer.from(cred.public_key, 'base64');
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(publicKeyBuffer),
        counter: cred.counter,
      },
    });

    if (!verification.verified) return res.status(400).json({ error: 'Verification failed' });

    await supabase.from('webauthn_credentials').update({ counter: verification.authenticationInfo.newCounter }).eq('id', cred.id);
    await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id);

    // Create a Supabase session for this user
    const { data: sessionData, error: sessionErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: (await supabase.from('profiles').select('email').eq('id', cred.user_id).single()).data?.email ?? '',
    });
    if (sessionErr) throw sessionErr;

    // Exchange the token
    const { data: { user } } = await supabase.auth.admin.getUserById(cred.user_id);
    const { data: tokenData } = await supabase.auth.admin.createSession({ userId: cred.user_id });

    res.json({ session: tokenData?.session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Dreno server running on port ${PORT}`));
