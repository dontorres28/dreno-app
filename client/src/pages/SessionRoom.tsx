import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SessionRoom() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!bookingId || !user) return;
    async function load() {
      try {
        const { data: b, error: bErr } = await supabase
          .from('bookings')
          .select('*, profiles!bookings_coach_id_fkey(name)')
          .eq('id', bookingId)
          .single();
        if (bErr) throw bErr;

        if (b.athlete_id !== user!.id && b.coach_id !== user!.id) {
          toast.error('Access denied');
          navigate('/dashboard');
          return;
        }
        setBooking(b);

        const { data: s } = await supabase
          .from('sessions')
          .select('*')
          .eq('booking_id', bookingId)
          .maybeSingle();
        if (s) {
          setSession(s);
          const field = profile?.role === 'coach' ? 'coach_notes' : 'athlete_notes';
          setNotes(s[field] ?? '');
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load session');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId, user, profile]);

  // Session timer
  useEffect(() => {
    if (!booking || booking.status === 'completed' || ended) return;
    const start = booking.starts_at ? new Date(booking.starts_at).getTime() : Date.now();
    function tick() {
      const secs = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(secs);
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [booking, ended]);

  function formatTime(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  async function createRoom() {
    if (!bookingId) return;
    setCreatingRoom(true);
    try {
      const data = await apiPost(`/api/bookings/${bookingId}/create-room`, {});
      setBooking((prev: any) => ({ ...prev, room_url: data.room_url }));
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create room');
    } finally {
      setCreatingRoom(false);
    }
  }

  async function endSession() {
    if (!bookingId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await supabase.from('sessions').upsert({
        booking_id: bookingId,
        ended_at: new Date().toISOString(),
      }, { onConflict: 'booking_id' });
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
      setEnded(true);
      toast.success('Session ended');
      if (profile?.role === 'athlete') {
        navigate(`/session/${bookingId}/feedback`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Could not end session');
    }
  }

  async function saveNotes() {
    if (!bookingId) return;
    setSavingNotes(true);
    try {
      const field = profile?.role === 'coach' ? 'coach_notes' : 'athlete_notes';
      const { error } = await supabase.from('sessions').upsert({
        booking_id: bookingId,
        [field]: notes,
      }, { onConflict: 'booking_id' });
      if (error) throw error;
      toast.success('Notes saved');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
          <Spinner size={32} />
        </div>
      </Layout>
    );
  }

  const coachName = booking?.profiles?.name ?? 'Coach';
  const isCompleted = ended || booking?.status === 'completed';

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {profile?.role === 'athlete' ? t('session.sessionWith', { name: coachName }) : t('session.sessionRoom')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--w40)', marginTop: 4 }}>
              {booking?.starts_at
                ? new Date(booking.starts_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) +
                  ' ' + t('session.at') + ' ' +
                  new Date(booking.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!isCompleted && (
              <div style={{
                fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em', color: elapsed > 3600 ? 'var(--red)' : 'var(--w60)',
                padding: '6px 14px', borderRadius: 8,
                background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              }}>
                {formatTime(elapsed)}
              </div>
            )}
            {isCompleted && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 50,
                background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.9)',
              }}>
                {t('session.completed')}
              </span>
            )}
            {!isCompleted && (
              <button
                onClick={endSession}
                style={{
                  fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 50,
                  background: 'rgba(255,48,64,0.1)', border: '0.5px solid rgba(255,48,64,0.3)',
                  color: 'var(--red)', cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,48,64,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,48,64,0.1)')}
              >
                {t('session.endSession')}
              </button>
            )}
          </div>
        </div>

        {/* Video room */}
        <div style={{
          width: '100%', borderRadius: 16, overflow: 'hidden',
          border: '0.5px solid var(--surface-border)',
          background: '#0D1B2A', marginBottom: '1.5rem',
          aspectRatio: '16/9', position: 'relative',
        }}>
          {booking?.room_url ? (
            <iframe
              src={booking.room_url}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Session room"
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, color: 'rgba(235,228,210,0.5)', marginBottom: 6 }}>
                  {t('session.noRoom')}
                </p>
                <p style={{ fontSize: 13, color: 'rgba(235,228,210,0.25)' }}>
                  {t('session.noRoomSub')}
                </p>
              </div>
              {profile?.role === 'coach' && (
                <button className="btn-primary" onClick={createRoom} disabled={creatingRoom}>
                  {creatingRoom ? <Spinner size={18} /> : t('session.startRoom')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{
          background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
          borderRadius: 16, padding: '1.5rem',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>
            {profile?.role === 'coach' ? t('session.sessionNotes') : t('session.yourNotes')}
          </p>
          <textarea
            className="input"
            rows={5}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('session.notesPlaceholder')}
            style={{ width: '100%', resize: 'vertical', marginBottom: '0.875rem' }}
          />
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            style={{
              fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 50,
              background: 'var(--surface-border)', border: '0.5px solid var(--surface-border-2)',
              color: 'var(--w60)', cursor: 'pointer', transition: 'color 0.15s',
            }}
          >
            {savingNotes ? <Spinner size={14} /> : t('session.saveNotes')}
          </button>
        </div>
      </div>
    </Layout>
  );
}
