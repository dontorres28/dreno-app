import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Slot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABEL: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function nextDateForDay(dayName: string): Date {
  const today = new Date();
  const targetDay = DAY_ORDER.indexOf(dayName.toLowerCase());
  const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
  let diff = targetDay - currentDay;
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

const ALL_DURATIONS = [30, 45, 60, 90, 120];

export default function Book() {
  const { t } = useTranslation();
  const { id: coachId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coach, setCoach] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [manualDate, setManualDate] = useState(todayStr);
  const [manualTime, setManualTime] = useState('10:00');
  const [manualDuration, setManualDuration] = useState(60);

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
        const first = ALL_DURATIONS.find(d => d >= min && d <= max) ?? min;
        setManualDuration(first);
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [coachId]);

  async function handleBook() {
    if (!user || !coach) return;
    setBooking(true);
    try {
      let startsAt: string;
      let durationMin: number;
      let availabilityId: string | undefined;

      if (slots.length > 0 && selectedSlot) {
        const bookingDate = nextDateForDay(selectedSlot.day_of_week);
        const [startH, startM] = selectedSlot.start_time.split(':').map(Number);
        const [endH, endM] = selectedSlot.end_time.split(':').map(Number);
        const start = new Date(bookingDate);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(bookingDate);
        end.setHours(endH, endM, 0, 0);
        startsAt = start.toISOString();
        durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
        availabilityId = selectedSlot.id;
      } else {
        const [h, m] = manualTime.split(':').map(Number);
        const start = new Date(manualDate);
        start.setHours(h, m, 0, 0);
        startsAt = start.toISOString();
        durationMin = manualDuration;
      }

      const priceCents = (coach.hourly_rate ?? 0) * 100;
      await apiPost('/api/bookings', {
        coachId, availabilityId, startsAt, durationMin, priceCents,
        notes: notes.trim() || undefined,
      });

      toast.success('Booking request sent. Your coach will confirm shortly.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={32} /></div></Layout>;
  }

  const coachName = coach?.profiles?.name ?? 'Coach';
  const hasSlots = slots.length > 0;
  const canBook = hasSlots ? !!selectedSlot : (manualDate && manualTime);
  const allowedDurations = ALL_DURATIONS.filter(d => d >= (coach?.min_session_min ?? 30) && d <= (coach?.max_session_min ?? 120));

  // Group slots by day
  const slotsByDay: Record<string, Slot[]> = {};
  for (const s of slots) {
    const key = s.day_of_week.toLowerCase();
    if (!slotsByDay[key]) slotsByDay[key] = [];
    slotsByDay[key].push(s);
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)', border: '0.5px solid var(--input-border)',
    borderRadius: 10, padding: '10px 14px', color: 'var(--white)',
    fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
  };

  return (
    <Layout>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {t('book.title')}
        </h1>
        <p style={{ color: 'var(--w40)', marginBottom: '2.5rem', fontSize: 14 }}>
          {t('book.with')} {coachName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Availability */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--surface-border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>
                {t('book.pickTime')}
              </p>
            </div>

            {hasSlots ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {DAY_ORDER.map((day, idx) => {
                  const daySlots = slotsByDay[day] ?? [];
                  const available = daySlots.length > 0;
                  const date = nextDateForDay(day);
                  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const isLast = idx === DAY_ORDER.length - 1;
                  return (
                    <div
                      key={day}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '14px 18px',
                        borderBottom: isLast ? 'none' : '0.5px solid var(--surface-border)',
                        opacity: available ? 1 : 0.4,
                      }}
                    >
                      {/* Day + date */}
                      <div style={{ minWidth: 80, flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: available ? 'var(--white)' : 'var(--w40)' }}>
                          {DAY_LABEL[day]}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--w50)', marginTop: 1 }}>{dateLabel}</p>
                      </div>

                      {/* Availability indicator + slots */}
                      {available ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                          {daySlots.map(slot => {
                            const isSelected = selectedSlot?.id === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                className="toggle-btn"
                                onClick={() => setSelectedSlot(isSelected ? null : slot)}
                                style={{
                                  padding: '5px 12px', borderRadius: 50, fontSize: 12, fontWeight: 500,
                                  border: isSelected ? '1px solid var(--red)' : '0.5px solid var(--surface-border)',
                                  background: isSelected ? 'rgba(255,48,64,0.12)' : 'var(--surface-1)',
                                  color: isSelected ? 'var(--white)' : 'var(--w60)',
                                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                                }}
                              >
                                {fmt12(slot.start_time)} – {fmt12(slot.end_time)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: '0.5px', background: 'var(--surface-border)' }} />
                          <p style={{ fontSize: 12, color: 'var(--w50)', flexShrink: 0 }}>Unavailable</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: 13, color: 'var(--w40)' }}>{t('book.noSlots')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('book.date')}</p>
                    <input type="date" value={manualDate} min={todayStr} onChange={e => setManualDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('book.time')}</p>
                    <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                {allowedDurations.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('book.duration')}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {allowedDurations.map(d => (
                        <button
                          key={d}
                          type="button"
                          className="toggle-btn"
                          onClick={() => setManualDuration(d)}
                          style={{
                            padding: '6px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                            border: manualDuration === d ? '1px solid var(--red)' : '0.5px solid var(--surface-border)',
                            background: manualDuration === d ? 'rgba(255,48,64,0.12)' : 'transparent',
                            color: manualDuration === d ? 'var(--white)' : 'var(--w60)',
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--surface-border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>
                {t('book.notesLabel')}
              </p>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('book.notesPlaceholder')}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, background: 'transparent', border: 'none', padding: 0 }}
              />
            </div>
          </div>

          {/* Rate */}
          {coach?.hourly_rate && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px',
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16,
              fontSize: 14,
            }}>
              <span style={{ color: 'var(--w60)' }}>{t('book.sessionRate')}</span>
              <span style={{ fontWeight: 600 }}>CHF {coach.hourly_rate}<span style={{ fontWeight: 400, fontSize: 12, color: 'var(--w40)', marginLeft: 3 }}>/hr</span></span>
            </div>
          )}

          {/* CTA */}
          <button
            className="btn-primary"
            style={{
              width: '100%', padding: '15px', fontSize: 15,
              opacity: (!canBook || booking) ? 0.4 : 1,
              cursor: (!canBook || booking) ? 'not-allowed' : 'pointer',
            }}
            disabled={!canBook || booking}
            onClick={handleBook}
          >
            {booking ? <Spinner size={18} /> : t('book.requestSession')}
          </button>

          <p style={{ fontSize: 12, color: 'var(--w30)', textAlign: 'center', marginTop: -4 }}>
            {t('book.noPayment')}
          </p>
        </div>
      </div>
    </Layout>
  );
}
