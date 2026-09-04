import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import Stepper from '../components/Stepper';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Slot { id: string; day_of_week: string; start_time: string; end_time: string; }

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABEL: Record<string,string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu',
  friday:'Fri', saturday:'Sat', sunday:'Sun',
};
const ALL_DURATIONS = [30, 45, 60, 90, 120];
const TOTAL_STEPS = 3;

function nextDateForDay(day: string): Date {
  const today = new Date();
  const target = DAY_ORDER.indexOf(day.toLowerCase());
  const current = today.getDay() === 0 ? 6 : today.getDay() - 1;
  let diff = target - current;
  if (diff <= 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d;
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2,'0')}${ampm}`;
}

export default function Book() {
  const { id: coachId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [coach, setCoach] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [step, setStep] = useState(0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [manualDate, setManualDate] = useState(todayStr);
  const [manualTime, setManualTime] = useState('10:00');
  const [manualDuration, setManualDuration] = useState(60);
  const [notes, setNotes] = useState('');

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [step]);

  useEffect(() => {
    if (!coachId) return;
    async function load() {
      try {
        const [coachRes, slotRes] = await Promise.all([
          supabase.from('coaches').select('*, profiles(name)').eq('id', coachId).single(),
          supabase.from('availability').select('*').eq('coach_id', coachId),
        ]);
        if (coachRes.error) throw coachRes.error;
        setCoach(coachRes.data);
        setSlots(slotRes.data ?? []);
        const min = coachRes.data?.min_session_min ?? 30;
        const max = coachRes.data?.max_session_min ?? 120;
        setManualDuration(ALL_DURATIONS.find(d => d >= min && d <= max) ?? min);
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load');
      } finally { setLoading(false); }
    }
    load();
  }, [coachId]);

  const hasSlots = slots.length > 0;
  const allowedDurations = ALL_DURATIONS.filter(d =>
    d >= (coach?.min_session_min ?? 30) && d <= (coach?.max_session_min ?? 120)
  );
  const slotsByDay: Record<string, Slot[]> = {};
  for (const s of slots) {
    const key = s.day_of_week.toLowerCase();
    if (!slotsByDay[key]) slotsByDay[key] = [];
    slotsByDay[key].push(s);
  }

  function getDateTime() {
    if (hasSlots && selectedSlot) {
      const date = nextDateForDay(selectedSlot.day_of_week);
      return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + fmt12(selectedSlot.start_time);
    }
    const d = new Date(manualDate);
    const [h, m] = manualTime.split(':').map(Number);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) +
      ', ' + fmt12(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
  }

  function getDuration() {
    if (hasSlots && selectedSlot) {
      const [sh, sm] = selectedSlot.start_time.split(':').map(Number);
      const [eh, em] = selectedSlot.end_time.split(':').map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    }
    return manualDuration;
  }

  const canAdvance = [
    hasSlots ? !!selectedSlot : !!(manualDate && manualTime),
    true,
    true,
  ][step];

  async function handleBook() {
    if (!user || !coach) return;
    setBooking(true);
    try {
      let startsAt: string, durationMin: number, availabilityId: string | undefined;
      if (hasSlots && selectedSlot) {
        const date = nextDateForDay(selectedSlot.day_of_week);
        const [sh, sm] = selectedSlot.start_time.split(':').map(Number);
        const [eh, em] = selectedSlot.end_time.split(':').map(Number);
        const start = new Date(date); start.setHours(sh, sm, 0, 0);
        const end = new Date(date); end.setHours(eh, em, 0, 0);
        startsAt = start.toISOString();
        durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
        availabilityId = selectedSlot.id;
      } else {
        const [h, m] = manualTime.split(':').map(Number);
        const start = new Date(manualDate); start.setHours(h, m, 0, 0);
        startsAt = start.toISOString();
        durationMin = manualDuration;
      }
      await apiPost('/api/bookings', {
        coachId, availabilityId, startsAt, durationMin,
        priceCents: (coach.hourly_rate ?? 0) * 100,
        notes: notes.trim() || undefined,
      });
      navigate('/payment/success');
    } catch (err: any) {
      toast.error(err.message ?? 'Booking failed');
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Spinner size={28} />
      </div>
    );
  }

  const coachName = coach?.profiles?.name ?? 'Coach';
  const dur = getDuration();
  const price = coach?.hourly_rate ? (coach.hourly_rate * dur / 60).toFixed(0) : null;

  // Selection pill helper — matches onboarding
  const pill = (label: string, active: boolean, onClick: () => void, small = false) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: small ? '9px 16px' : '12px 20px',
        borderRadius: 50, fontSize: small ? 13 : 14, fontWeight: 600,
        cursor: 'pointer', transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
        fontFamily: 'var(--font-body)',
        background: active ? 'var(--red)' : 'var(--surface-1)',
        border: active ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
        color: active ? '#fff' : 'var(--w80)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', color: 'var(--white)', WebkitFontSmoothing: 'antialiased' }}>
      {/* Top bar — matches onboarding */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 20px', flexShrink: 0 }}>
        <div style={{ width: 72, display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}
            aria-label="Back"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w70)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, padding: '8px 4px 8px 0', fontFamily: 'var(--font-body)', letterSpacing: '-0.005em' }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <Stepper step={step} total={TOTAL_STEPS} />
        </div>
        <div style={{ width: 72, display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggle />
        </div>
      </div>

      {/* Content — centered like onboarding */}
      <div ref={scrollRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 6vw 0', overflowY: 'auto' }}>

        {/* STEP 0: When */}
        {step === 0 && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
              When works for you?
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Book with {coachName}.
            </p>

            {hasSlots ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {DAY_ORDER.map(day => {
                  const daySlots = slotsByDay[day] ?? [];
                  const available = daySlots.length > 0;
                  const date = nextDateForDay(day);
                  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  if (!available) return null;
                  return (
                    <div key={day}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '0.625rem' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', letterSpacing: '-0.005em' }}>{DAY_LABEL[day]}</p>
                        <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '0.02em' }}>{dateLabel}</p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {daySlots.map(slot => pill(
                          `${fmt12(slot.start_time)} – ${fmt12(slot.end_time)}`,
                          selectedSlot?.id === slot.id,
                          () => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot),
                          true,
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={manualDate} min={todayStr} onChange={e => setManualDate(e.target.value)} style={{ fontSize: 15 }} />
                </div>
                <div>
                  <label className="label">Time</label>
                  <input className="input" type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{ fontSize: 15 }} />
                </div>
                {allowedDurations.length > 0 && (
                  <div>
                    <label className="label">Duration</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 4 }}>
                      {allowedDurations.map(d => pill(`${d}m`, manualDuration === d, () => setManualDuration(d), true))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Note */}
        {step === 1 && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
              What do you<br />want to work on?
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Helps your coach prepare. Skip if you're not sure yet.
            </p>
            <textarea
              rows={7}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Be specific. What's happening right now, what you want to change, what you've tried…"
              className="input"
              style={{ resize: 'none', lineHeight: 1.65, fontSize: 15, padding: '18px' }}
              autoFocus
            />
          </div>
        )}

        {/* STEP 2: Confirm */}
        {step === 2 && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
              Confirm
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.6, marginBottom: '2rem' }}>
              No payment yet. Your coach confirms first.
            </p>

            <div style={{
              background: 'var(--surface-1)',
              border: '0.5px solid var(--surface-border-2)',
              borderRadius: 16, overflow: 'hidden',
              marginBottom: '2rem',
            }}>
              {[
                { label: 'Coach', value: coachName },
                { label: 'When', value: getDateTime() },
                { label: 'Duration', value: `${dur} min` },
                ...(price ? [{ label: 'Price', value: `CHF ${price}` }] : []),
                ...(notes.trim() ? [{ label: 'Note', value: notes.trim() }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display: 'flex', gap: '1rem', padding: '14px 18px',
                  borderBottom: i < arr.length - 1 ? '0.5px solid var(--surface-border)' : 'none',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--w60)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', minWidth: 72, flexShrink: 0, paddingTop: 3 }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.55, flex: 1 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA — centered, matches onboarding */}
      <div style={{ padding: '1.5rem 6vw 2.5rem', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {step < TOTAL_STEPS - 1 ? (
          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 50, padding: '0 32px', width: '100%', maxWidth: 520, opacity: canAdvance ? 1 : 0.35 }}
            disabled={!canAdvance}
            onClick={() => setStep(s => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 50, padding: '0 32px', width: '100%', maxWidth: 520, opacity: booking ? 0.5 : 1 }}
            disabled={booking}
            onClick={handleBook}
          >
            {booking ? <Spinner size={18} /> : 'Send request'}
          </button>
        )}
      </div>
    </div>
  );
}
