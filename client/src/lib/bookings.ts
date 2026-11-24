import { supabase } from './supabase';

// Jitsi room is deterministic from the booking id — no API, no secret.
export function jitsiRoomUrl(bookingId: string) {
  return `https://meet.jit.si/dreno-${bookingId}`;
}

// Athlete creates a pending booking. RLS p_book_ins requires athlete_id = me.
// The availability slot is flipped to booked on confirm (coach owns that row), not here.
export async function createBooking(input: {
  coachId: string; availabilityId?: string; startsAt: string;
  durationMin?: number; priceCents?: number; notes?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error('Not signed in');
  const priceCents = input.priceCents ?? 0;
  const { data, error } = await supabase.from('bookings').insert({
    athlete_id: uid,
    coach_id: input.coachId,
    availability_id: input.availabilityId || null,
    starts_at: input.startsAt,
    duration_min: input.durationMin || 60,
    price_cents: priceCents,
    commission_cents: Math.round(priceCents * 0.25),
    status: 'pending',
    ...(input.notes ? { notes: input.notes } : {}),
  }).select().single();
  if (error) throw error;
  return data;
}

// Coach confirms: sets the deterministic room and marks the slot booked
// (coach owns the availability row, so RLS p_avail_coach allows the flip).
export async function confirmBooking(id: string) {
  const { data, error } = await supabase.from('bookings')
    .update({ status: 'confirmed', room_url: jitsiRoomUrl(id) })
    .eq('id', id).select('*, availability_id').single();
  if (error) throw error;
  if (data?.availability_id) {
    await supabase.from('availability').update({ is_booked: true }).eq('id', data.availability_id);
  }
  return data;
}

// Either party cancels. Freeing the slot only succeeds coach-side under RLS; harmless otherwise.
export async function cancelBooking(id: string) {
  const { data: b } = await supabase.from('bookings').select('availability_id').eq('id', id).single();
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
  if (b?.availability_id) {
    await supabase.from('availability').update({ is_booked: false }).eq('id', b.availability_id);
  }
  return { ok: true };
}

// Idempotent room getter for the session screen.
export async function getOrCreateRoom(id: string) {
  const { data: b } = await supabase.from('bookings').select('room_url').eq('id', id).single();
  const roomUrl = b?.room_url || jitsiRoomUrl(id);
  if (!b?.room_url) {
    await supabase.from('bookings').update({ room_url: roomUrl }).eq('id', id);
  }
  return { room_url: roomUrl };
}
