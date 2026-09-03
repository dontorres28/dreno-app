import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
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
const TOTAL = 3;

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

const STEP_LABELS = ['When', 'Note', 'Confirm'];

export default function Book() {
  const { id: coachId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [coach, setCoach] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [manualDate, setManualDate] = useState(todayStr);
  const [manualTime, setManualTime] = useState('10:00');
  const [manualDuration, setManualDuration] = useState(60);
  const [notes, setNotes] = useState('');

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

  function goTo(next: number) {
    if (animating) return;
    setAnimDir(next > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setAnimating(false);
    }, 160);
  }

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
      const [h, m] = selectedSlot.start_time.split(':').map(Number);
      date.setHours(h, m, 0, 0);
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

  const canNext0 = hasSlots ? !!selectedSlot : !!(manualDate && manualTime);

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Spinner size={28} />
      </div>
    );
  }

  const coachName = coach?.profiles?.name ?? 'Coach';
  const dur = getDuration();
  const price = coach?.hourly_rate ? (coach.hourly_rate * dur / 60).toFixed(0) : null;

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--surface-border)',
    borderRadius: 12, padding: '13px 16px', color: 'var(--white)',
    fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
    WebkitAppearance: 'none',
  };

  const animStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${animDir === 'forward' ? '-18px' : '18px'})`
      : 'translateX(0)',
    transition: 'opacity 0.16s ease, transform 0.16s ease',
  };

  return (
    <>
      <style>{`
        .slot-pill {
          padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 500;
          font-family: var(--font-body); cursor: pointer;
          border: 0.5px solid var(--surface-border);
          background: transparent; color: var(--w60);
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .slot-pill:hover { border-color: var(--w40); color: var(--white); }
        .slot-pill.selected {
          border-color: var(--red); border-width: 1px;
          background: rgba(255,48,64,0.1); color: var(--white);
        }
        .dur-pill {
          padding: 9px 20px; border-radius: 50px; font-size: 14px; font-weight: 500;
          font-family: var(--font-body); cursor: pointer;
          border: 0.5px solid var(--surface-border);
          background: transparent; color: var(--w60);
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .dur-pill:hover { border-color: var(--w40); color: var(--white); }
        .dur-pill.selected {
          border-color: var(--red); border-width: 1px;
          background: rgba(255,48,64,0.1); color: var(--white);
        }
        .summary-row {
          display: flex; gap: 1rem; padding: 15px 0;
          border-bottom: 0.5px solid var(--surface-border);
        }
        .summary-row:last-child { border-bottom: none; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5); cursor: pointer;
        }
      `}</style>

      <div ref={scrollRef} style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => step === 0 ? navigate(-1) : goTo(step - 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w50)', fontFamily: 'var(--font-body)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, padding: 0, letterSpacing: '0.01em' }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4L6 10l6 6"/>
            </svg>
            {step === 0 ? 'Back' : STEP_LABELS[step - 1]}
          </button>

          <span style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
            <span style={{ color: 'var(--white)' }}>DRENO</span><span style={{ color: 'var(--red)' }}>/</span>
          </span>

          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {STEP_LABELS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 18 : 6, height: 6, borderRadius: 50,
                background: i === step ? 'var(--red)' : i < step ? 'var(--w40)' : 'var(--surface-border)',
                transition: 'width 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
              }} />
            ))}
          </div>
        </div>

        {/* Progress line */}
        <div style={{ height: '0.5px', background: 'var(--line)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${((step + 1) / TOTAL) * 100}%`,
            background: 'var(--red)', opacity: 0.7,
            transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>

        {/* Content */}
        <div ref={contentRef} style={{ flex: 1, maxWidth: 520, width: '100%', margin: '0 auto', padding: '3rem 1.5rem 7rem', ...animStyle }}>

          {/* STEP 0: Pick a time */}
          {step === 0 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--w30)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                Book with {coachName}
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', marginBottom: '2.75rem' }}>
                When?
              </h1>

              {hasSlots ? (
                <div>
                  {DAY_ORDER.map((day) => {
                    const daySlots = slotsByDay[day] ?? [];
                    const available = daySlots.length > 0;
                    const date = nextDateForDay(day);
                    const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    return (
                      <div
                        key={day}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1.25rem',
                          padding: '13px 0',
                          borderBottom: '0.5px solid var(--surface-border)',
                          opacity: available ? 1 : 0.3,
                        }}
                      >
                        <div style={{ minWidth: 64, flexShrink: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', letterSpacing: '-0.01em' }}>{DAY_LABEL[day]}</p>
                          <p style={{ fontSize: 11, color: 'var(--w40)', marginTop: 2, letterSpacing: '0.02em' }}>{dateLabel}</p>
                        </div>
                        {available ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {daySlots.map(slot => (
                              <button
                                key={slot.id}
                                type="button"
                                className={`slot-pill${selectedSlot?.id === slot.id ? ' selected' : ''}`}
                                onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                              >
                                {fmt12(slot.start_time)} – {fmt12(slot.end_time)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--w25)', letterSpacing: '0.02em' }}>Unavailable</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <p style={{ fontSize: 14, color: 'var(--w40)', lineHeight: 1.7, marginBottom: '0.25rem' }}>
                    No fixed weekly slots. Suggest a time and your coach confirms.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--w40)', marginBottom: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Date</label>
                    <input type="date" value={manualDate} min={todayStr} onChange={e => setManualDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--w40)', marginBottom: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Time</label>
                    <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={inputStyle} />
                  </div>
                  {allowedDurations.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--w40)', marginBottom: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Duration</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {allowedDurations.map(d => (
                          <button key={d} type="button" className={`dur-pill${manualDuration === d ? ' selected' : ''}`} onClick={() => setManualDuration(d)}>
                            {d}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Note */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--w30)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                Optional
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 9vw, 4.5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                What do you want to work on?
              </h1>
              <p style={{ fontSize: 14, color: 'var(--w35)', marginBottom: '2.25rem', lineHeight: 1.7 }}>
                Helps your coach prepare. Skip if you're not sure yet.
              </p>
              <textarea
                rows={7}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Be specific. What's happening right now, what you want to change, what you've tried..."
                style={{
                  ...inputStyle,
                  resize: 'none', lineHeight: 1.65,
                  borderRadius: 16, padding: '18px',
                  fontSize: 14,
                }}
              />
            </div>
          )}

          {/* STEP 2: Confirm */}
          {step === 2 && (
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', marginBottom: '2.75rem' }}>
                Confirm.
              </h1>

              <div style={{ borderTop: '0.5px solid var(--surface-border)', marginBottom: '2.5rem' }}>
                {[
                  { label: 'Coach', value: coachName },
                  { label: 'When', value: getDateTime() },
                  { label: 'Duration', value: `${dur} min` },
                  ...(price ? [{ label: 'Price', value: `CHF ${price}` }] : []),
                  ...(notes.trim() ? [{ label: 'Note', value: notes.trim() }] : []),
                ].map(row => (
                  <div key={row.label} className="summary-row">
                    <span style={{ fontSize: 12, color: 'var(--w35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: 72, flexShrink: 0, paddingTop: 1 }}>{row.label}</span>
                    <span style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.55 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 13, color: 'var(--w30)', lineHeight: 1.7 }}>
                No payment now. Your coach confirms first, then you'll get a link to the session.
              </p>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div style={{
          position: 'sticky', bottom: 0, background: 'var(--bg)',
          borderTop: '0.5px solid var(--line)',
          padding: '1rem 1.5rem',
        }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            {step < TOTAL - 1 ? (
              <button
                className="btn-primary"
                style={{
                  width: '100%', padding: '15px', fontSize: 15,
                  opacity: step === 0 && !canNext0 ? 0.35 : 1,
                  cursor: step === 0 && !canNext0 ? 'not-allowed' : 'pointer',
                  transform: 'translateZ(0)',
                }}
                disabled={step === 0 && !canNext0}
                onClick={() => goTo(step + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '15px', fontSize: 15, opacity: booking ? 0.5 : 1 }}
                disabled={booking}
                onClick={handleBook}
              >
                {booking ? <Spinner size={18} /> : 'Send request'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
