import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { apiPost, apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  starts_at: string;
  status: string;
  profiles: { name: string | null } | null;
}

interface RingProps {
  value: number; max: number; color: string;
  label: string; sub: string; fmt?: (v: number) => string;
}

function Ring({ value, max, color, label, sub, fmt }: RingProps) {
  const size = 72, sw = 5;
  const radius = (size - sw) / 2;
  const circ = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - Math.min(value / max, 1) * circ), 150);
    return () => clearTimeout(t);
  }, [value, max, circ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--surface-border)" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {fmt ? fmt(value) : value}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--w80)', letterSpacing: '-0.01em', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--w40)' }}>{sub}</p>
      </div>
    </div>
  );
}

function completenessOf(coach: any): number {
  if (!coach) return 0;
  const fields = ['headline', 'bio', 'credentials', 'hourly_rate', 'photo_url', 'sports', 'expertise_tags'];
  const filled = fields.filter(f => {
    const v = coach[f];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

export default function CoachDashboard() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [coach, setCoach] = useState<any>(null);
  const [checkInAgg, setCheckInAgg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    try {
      const [bookRes, coachRes] = await Promise.all([
        supabase.from('bookings')
          .select('id, starts_at, status, profiles!bookings_athlete_id_fkey(name)')
          .eq('coach_id', user.id)
          .in('status', ['confirmed', 'pending'])
          .order('starts_at'),
        supabase.from('coaches').select('*').eq('id', user.id).single(),
      ]);
      if (bookRes.error) throw bookRes.error;
      if (coachRes.error) throw coachRes.error;
      setBookings((bookRes.data ?? []) as unknown as Booking[]);
      setCoach(coachRes.data);
      apiGet('/api/coach/check-in-aggregate').then(d => setCheckInAgg(d)).catch(() => {});
    } catch (err: any) {
      toast.error(err.message ?? 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  async function confirm(id: string) {
    setActing(id);
    try { await apiPost(`/api/bookings/${id}/confirm`, {}); toast.success('Confirmed.'); load(); }
    catch (err: any) { toast.error(err.message ?? 'Could not confirm'); }
    finally { setActing(null); }
  }

  async function cancel(id: string) {
    setActing(id);
    try { await apiPost(`/api/bookings/${id}/cancel`, {}); toast.success('Cancelled.'); load(); }
    catch (err: any) { toast.error(err.message ?? 'Could not cancel'); }
    finally { setActing(null); }
  }

  const firstName = profile?.name?.split(' ')[0] ?? null;
  const pct = completenessOf(coach);
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const uniqueAthletes = new Set(bookings.map(b => b.profiles?.name).filter(Boolean)).size;
  const verStatus = coach?.verified_status ?? 'pending';

  const statusColor = verStatus === 'verified' ? '#4ade80' : verStatus === 'rejected' ? 'var(--red)' : 'rgba(251,191,36,0.9)';
  const statusLabel = verStatus === 'verified' ? 'Verified' : verStatus === 'rejected' ? 'Rejected' : 'Under review';

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}><Spinner size={28} /></div></Layout>;
  }

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.25rem 6rem' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 8vw, 3.5rem)',
            lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.4rem',
          }}>
            {firstName ? `Hi, ${firstName}.` : 'Dashboard'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <p style={{ fontSize: 14, color: 'var(--w40)' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <span style={{ color: 'var(--w20)', fontSize: 12 }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
              <span style={{ fontSize: 12, color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
            </div>
          </div>
          {verStatus === 'rejected' && coach?.rejection_reason && (
            <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 4 }}>{coach.rejection_reason}</p>
          )}
        </div>

        {/* Stats ring card */}
        <div style={{
          background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
          borderRadius: 20, padding: '1.5rem 1.25rem', marginBottom: '1rem',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem',
        }}>
          <Ring value={confirmedCount} max={10} color="var(--red)" label="Sessions" sub="confirmed" />
          <Ring value={uniqueAthletes} max={20} color="rgba(251,191,36,0.9)" label="Athletes" sub="active" />
          <Ring value={pct} max={100} color="rgba(52,211,153,0.9)" label="Profile" sub="complete" fmt={v => `${v}%`} />
        </div>

        {/* Athlete feedback */}
        {checkInAgg !== undefined && checkInAgg?.response_count_30d >= 5 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderRadius: 14, marginBottom: '1rem',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: 6 }}>
                Athlete feedback, last 30 days
              </p>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{checkInAgg.useful_rate_30d}%</span>
                  <span style={{ fontSize: 12, color: 'var(--w40)', marginLeft: 5 }}>useful</span>
                </div>
                {checkInAgg.mood_avg_30d !== null && (
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{checkInAgg.mood_avg_30d}</span>
                    <span style={{ fontSize: 12, color: 'var(--w40)', marginLeft: 5 }}>avg mood</span>
                  </div>
                )}
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--w40)' }}>{checkInAgg.response_count_30d} responses</p>
          </div>
        )}

        {/* Pending alert */}
        {pendingCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.875rem 1.25rem', borderRadius: 12, marginBottom: '1rem',
            background: 'rgba(255,48,64,0.07)', border: '0.5px solid rgba(255,48,64,0.2)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>
              {pendingCount} booking{pendingCount > 1 ? 's' : ''} waiting for confirmation
            </p>
          </div>
        )}

        {/* Profile completeness */}
        {pct < 100 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.875rem 1.25rem', borderRadius: 12, marginBottom: '1rem',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: 6 }}>
                Finish your profile to get more bookings
              </p>
              <div style={{ height: 2, borderRadius: 2, background: 'var(--surface-border)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(52,211,153,0.7)', borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
            </div>
            <Link to="/coach/profile/edit" style={{
              fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 50,
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              color: 'var(--w60)', textDecoration: 'none', flexShrink: 0,
              fontFamily: 'var(--font-body)',
            }}>
              Edit profile
            </Link>
          </div>
        )}

        {/* Sessions card */}
        <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)' }}>
              Sessions
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/coach/athletes" style={{ fontSize: 13, color: 'var(--w60)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Athletes</Link>
              <Link to="/messages" style={{ fontSize: 13, color: 'var(--w60)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Messages</Link>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--w40)', marginBottom: '0.5rem' }}>No upcoming sessions.</p>
              <p style={{ fontSize: 13, color: 'var(--w30)' }}>Athletes can book you once your profile is verified.</p>
            </div>
          ) : (
            <div>
              {bookings.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    padding: '0.875rem 1.25rem',
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {(b.profiles?.name ?? 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.profiles?.name ?? 'Athlete'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 1 }}>
                        {new Date(b.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' '}
                        {new Date(b.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 50,
                      background: b.status === 'pending' ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)',
                      color: b.status === 'pending' ? 'rgba(251,191,36,0.9)' : 'rgba(52,211,153,0.9)',
                    }}>
                      {b.status}
                    </span>

                    {b.status === 'pending' && (
                      <button
                        className="btn-primary"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                        disabled={acting === b.id}
                        onClick={() => confirm(b.id)}
                      >
                        {acting === b.id ? <Spinner size={12} /> : 'Confirm'}
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <Link
                        to={`/session/${b.id}`}
                        className="btn-primary"
                        style={{ fontSize: 12, padding: '5px 12px', textDecoration: 'none' }}
                      >
                        Join
                      </Link>
                    )}
                    <button
                      onClick={() => cancel(b.id)}
                      disabled={acting === b.id}
                      style={{ fontSize: 12, color: 'var(--w40)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '5px 4px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
