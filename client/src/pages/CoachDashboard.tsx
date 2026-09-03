import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import Tooltip from '../components/Tooltip';
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

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 48) return `${Math.ceil(diff / 86400000)}d`;
  if (h >= 1) return `${h}h`;
  return `${m}m`;
}

// ── Week hero, mirrors athlete Dashboard ───────────────────────────────
function WeekHero({ confirmedThisWeek, uniqueAthletes, profilePct, bookings }: {
  confirmedThisWeek: number; uniqueAthletes: number; profilePct: number; bookings: Booking[];
}) {
  const today = new Date();
  const bookedDays = new Set(bookings.filter(b => b.status === 'confirmed').map(b => new Date(b.starts_at).toDateString()));
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : -(todayDow - 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      booked: bookedDays.has(d.toDateString()),
      isToday: d.toDateString() === today.toDateString(),
      label: d.toLocaleDateString('en-GB', { weekday: 'short' })[0],
      date: d.getDate(),
    };
  });

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(255,48,64,0.10) 0%, rgba(255,48,64,0.02) 100%)',
      border: '0.5px solid var(--surface-border-2)',
      borderRadius: 22, padding: 24,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -70, right: -70,
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,48,64,0.22) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 22, position: 'relative', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w70)', marginBottom: 10 }}>
            This week
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 4.5rem)', lineHeight: 0.88, letterSpacing: '-0.045em' }}>
            {confirmedThisWeek}
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--w70)', marginTop: 8 }}>
            {confirmedThisWeek === 0 ? 'No confirmed sessions yet.' :
             `${confirmedThisWeek} confirmed session${confirmedThisWeek !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {uniqueAthletes > 0 && (
          <Tooltip label={`${uniqueAthletes} unique athlete${uniqueAthletes !== 1 ? 's' : ''} on your roster`} side="left">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 50,
              background: 'rgba(255,48,64,0.14)',
              border: '0.5px solid rgba(255,48,64,0.30)',
              cursor: 'help', flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.02em' }}>
                {uniqueAthletes} athlete{uniqueAthletes !== 1 ? 's' : ''}
              </span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* Week strip */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', marginBottom: 4 }}>
        {days.map((d, i) => (
          <Tooltip key={i} label={d.booked ? `Session · ${d.date}` : d.isToday ? "Today · nothing yet" : `Free · ${d.date}`} side="top">
            <div style={{
              flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'help',
            }}>
              <span style={{
                fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
                color: d.isToday ? 'var(--red)' : d.booked ? 'var(--w70)' : 'var(--w50)',
              }}>
                {d.label}
              </span>
              <div style={{
                position: 'relative',
                width: '100%', aspectRatio: '1 / 1',
                maxWidth: 44, minHeight: 32,
                borderRadius: '50%',
                background: d.isToday ? 'var(--nav-active-bg)' : d.booked ? 'var(--red)' : 'transparent',
                border: d.isToday || d.booked ? 'none' : '0.5px solid var(--surface-border-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: d.booked && !d.isToday ? '0 2px 12px rgba(255,48,64,0.28)' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1,
                  color: d.isToday ? 'var(--nav-active-color)' : d.booked ? '#fff' : 'var(--w60)',
                }}>
                  {d.date}
                </span>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>

      {profilePct < 100 && (
        <p style={{
          marginTop: 18, paddingTop: 14, position: 'relative',
          borderTop: '0.5px solid var(--surface-border)',
          fontSize: 13, color: 'var(--w70)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <span>
            <span style={{ color: 'var(--white)', fontWeight: 700 }}>{profilePct}%</span> profile complete
          </span>
          <Link to="/coach/profile/edit" style={{
            fontSize: 12.5, fontWeight: 700, color: 'var(--red)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            Finish it
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </p>
      )}
    </div>
  );
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
  const uniqueAthletes = new Set(bookings.map(b => b.profiles?.name).filter(Boolean)).size;
  const verStatus = coach?.verified_status ?? 'pending';
  const statusColor = verStatus === 'verified' ? 'var(--white)' : verStatus === 'rejected' ? 'var(--red)' : 'var(--w70)';
  const statusLabel = verStatus === 'verified' ? 'Verified' : verStatus === 'rejected' ? 'Rejected' : 'Under review';

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const confirmedThisWeek = bookings.filter(b => b.status === 'confirmed' && new Date(b.starts_at) >= weekAgo && new Date(b.starts_at) <= new Date(new Date().setDate(new Date().getDate() + 7))).length;
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const upcomingConfirmed = bookings.filter(b => b.status === 'confirmed' && new Date(b.starts_at) >= new Date()).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const nextSession = upcomingConfirmed[0] ?? null;
  const sessionDate = nextSession ? new Date(nextSession.starts_at) : null;

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={28} /></div></Layout>;
  }

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '0.375rem', letterSpacing: '0.02em', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 8vw, 4.5rem)', lineHeight: 0.92, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
            {firstName ? `Hi, ${firstName}.` : 'Dashboard'}
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 50, background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 12, color: statusColor, fontWeight: 600, letterSpacing: '0.02em' }}>{statusLabel}</span>
          </div>
          {verStatus === 'rejected' && coach?.rejection_reason && (
            <p style={{ fontSize: 12, color: 'var(--w70)', marginTop: 8 }}>{coach.rejection_reason}</p>
          )}
        </div>

        {/* ── Week hero ── */}
        <div style={{ marginBottom: '1rem' }}>
          <WeekHero
            confirmedThisWeek={confirmedThisWeek}
            uniqueAthletes={uniqueAthletes}
            profilePct={pct}
            bookings={bookings}
          />
        </div>

        {/* ── Next session ── */}
        {nextSession && sessionDate ? (
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(255,48,64,0.10) 0%, rgba(255,48,64,0.02) 100%)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 22, padding: '1.5rem',
            marginBottom: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,48,64,0.20) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w70)', marginBottom: '0.5rem' }}>
                Next session
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.035em', lineHeight: 1, marginBottom: '0.375rem', color: 'var(--white)' }}>
                {nextSession.profiles?.name ?? 'Athlete'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--w70)' }}>
                {sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', background: 'rgba(255,48,64,0.14)', border: '0.5px solid rgba(255,48,64,0.30)', padding: '5px 12px', borderRadius: 50, letterSpacing: '0.02em' }}>
                {countdown(nextSession.starts_at)}
              </span>
              <Link to={`/session/${nextSession.id}`} className="btn-primary" style={{ fontSize: 13, minHeight: 40, padding: '0 22px', textDecoration: 'none' }}>
                Join
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 22, padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)', marginBottom: '0.5rem' }}>
              Next session
            </p>
            <p style={{ fontSize: 14.5, color: 'var(--w70)' }}>Nothing upcoming yet.</p>
          </div>
        )}

        {/* ── Two quick action cards (Athletes + Messages) — mirrors athlete today tasks ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginBottom: '1rem' }}>
          {[
            { to: '/coach/athletes', label: 'Roster', line: `${uniqueAthletes} athlete${uniqueAthletes !== 1 ? 's' : ''}` },
            { to: '/messages', label: 'Messages', line: 'Reply and follow up' },
          ].map(t => (
            <Link key={t.to} to={t.to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--surface-1)',
                border: '0.5px solid var(--surface-border-2)',
                borderRadius: 18, padding: '1.25rem',
                transition: 'background 220ms cubic-bezier(0.23, 1, 0.32, 1), border-color 220ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border-2)'; }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)', marginBottom: '0.75rem' }}>{t.label}</p>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--white)' }}>{t.line}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Feedback card ── */}
        {checkInAgg?.response_count_30d >= 5 && (
          <div style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 22, padding: '1.5rem 1.75rem', marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>Athlete feedback · 30d</p>
              <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '0.02em' }}>{checkInAgg.response_count_30d} responses</p>
            </div>
            <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-0.035em', color: 'var(--white)' }}>{checkInAgg.useful_rate_30d}%</span>
                <span style={{ fontSize: 12.5, color: 'var(--w70)', marginLeft: 6 }}>useful</span>
              </div>
              {checkInAgg.mood_avg_30d !== null && (
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-0.035em', color: 'var(--white)' }}>{checkInAgg.mood_avg_30d}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--w70)', marginLeft: 6 }}>avg mood</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sessions list ── */}
        <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 22, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '0.5px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>
              Upcoming
            </p>
            {pendingBookings.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', padding: '3px 10px', borderRadius: 50, background: 'rgba(255,48,64,0.14)', border: '0.5px solid rgba(255,48,64,0.28)', color: 'var(--red)' }}>
                {pendingBookings.length} pending
              </span>
            )}
          </div>

          {bookings.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--w70)', marginBottom: '0.375rem' }}>No upcoming sessions.</p>
              <p style={{ fontSize: 13, color: 'var(--w60)' }}>Athletes can book you once your profile is verified.</p>
            </div>
          ) : (
            <div>
              {bookings.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(255,48,64,0.20) 0%, rgba(255,48,64,0.08) 100%)',
                      border: '0.5px solid rgba(255,48,64,0.28)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--red)',
                      letterSpacing: '-0.02em',
                    }}>
                      {(b.profiles?.name ?? 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.profiles?.name ?? 'Athlete'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--w70)', marginTop: 2 }}>
                        {new Date(b.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(b.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {b.status === 'pending' && (
                      <button
                        className="btn-primary"
                        style={{ fontSize: 12, minHeight: 32, padding: '0 14px' }}
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
                        style={{ fontSize: 12, minHeight: 32, padding: '0 14px', textDecoration: 'none' }}
                      >
                        Join
                      </Link>
                    )}
                    <button
                      onClick={() => cancel(b.id)}
                      disabled={acting === b.id}
                      style={{ fontSize: 12, color: 'var(--w70)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '5px 4px' }}
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
