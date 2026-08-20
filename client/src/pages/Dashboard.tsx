import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Booking {
  id: string; starts_at: string; status: string;
  coaches: { profiles: { name: string | null } | null } | null;
}
interface Goal { id: string; title: string; horizon: string }
interface DrillResult { completed_at: string; composite_score: number }
interface JournalEntry { id: string; body: string; created_at: string }

const HORIZON_COLOR: Record<string, string> = {
  short: '#FF3040',
  mid: '#FBBF24',
  long: '#34D399',
};

function Ring({ value, max, color, size = 96, strokeWidth = 7, animated }: {
  value: number; max: number; color: string; size?: number;
  strokeWidth?: number; animated?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    if (!animated) { setOffset(circ - pct * circ); return; }
    const t = setTimeout(() => setOffset(circ - pct * circ), 120);
    return () => clearTimeout(t);
  }, [pct, circ, animated]);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke="var(--surface-border)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: animated ? 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }} />
    </svg>
  );
}

function journalText(body: string): string {
  try {
    const p = JSON.parse(body);
    if (p.v === 2 && p.blocks) return (p.blocks as {a:string}[]).map(b => b.a).join(' ');
  } catch {}
  return body;
}

function countdown(iso: string, nowLabel: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return nowLabel;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 48) return `${Math.ceil(diff / 86400000)}d`;
  if (h >= 1) return `${h}h`;
  return `${m}m`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [drillsThisWeek, setDrillsThisWeek] = useState(0);
  const [streak, setStreak] = useState(0);
  const [drillDoneToday, setDrillDoneToday] = useState(false);
  const [journalDoneToday, setJournalDoneToday] = useState(false);
  const [lastEntry, setLastEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => setAnimated(true), 200);
    async function load() {
      try {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const [bookRes, goalRes, drillRes, journalRes] = await Promise.all([
          supabase.from('bookings')
            .select('*, coaches:coach_id(profiles(name))')
            .eq('athlete_id', user!.id).eq('status', 'confirmed')
            .gte('starts_at', new Date().toISOString())
            .order('starts_at').limit(1),
          supabase.from('goals').select('id, title, horizon')
            .eq('athlete_id', user!.id).eq('status', 'active')
            .order('created_at', { ascending: true }).limit(5),
          supabase.from('drill_results').select('completed_at, composite_score')
            .eq('athlete_id', user!.id).gte('completed_at', monthAgo.toISOString())
            .order('completed_at', { ascending: true }),
          supabase.from('journal_entries').select('id, body, created_at')
            .eq('athlete_id', user!.id)
            .order('created_at', { ascending: false }).limit(1),
        ]);

        setNextBooking(bookRes.data?.[0] ?? null);
        setGoals(goalRes.data ?? []);
        const drills: DrillResult[] = drillRes.data ?? [];
        setDrillsThisWeek(drills.filter(d => new Date(d.completed_at) >= weekAgo).length);
        setDrillDoneToday(drills.some(d => new Date(d.completed_at) >= todayStart));
        let s = 0; const cur = new Date();
        const days = new Set(drills.map(d => new Date(d.completed_at).toDateString()));
        while (days.has(cur.toDateString())) { s++; cur.setDate(cur.getDate() - 1); }
        setStreak(s);
        const je = (journalRes.data ?? []) as JournalEntry[];
        setLastEntry(je[0] ?? null);
        if (je[0]) setJournalDoneToday(new Date(je[0].created_at) >= todayStart);
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load dashboard');
      } finally { setLoading(false); }
    }
    load();
    return () => clearTimeout(timer);
  }, [user]);

  const firstName = profile?.name?.split(' ')[0] ?? null;

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={28} /></div></Layout>;
  }

  const sessionDate = nextBooking ? new Date(nextBooking.starts_at) : null;

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3.5rem 1.25rem 6rem' }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 13, color: 'var(--w50)', marginBottom: '0.25rem', letterSpacing: '0.02em' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 9vw, 5rem)', lineHeight: 0.92, letterSpacing: '-0.04em' }}>
            {firstName ? `${t('dashboard.hi')}, ${firstName}.` : t('nav.dashboard')}
          </h1>
        </div>

        {/* ── Stats ── */}
        <div style={{
          background: 'var(--surface-1)', borderRadius: 24, padding: '1.5rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
        }}>
          {[
            { value: drillsThisWeek, max: 5, color: '#FF3040', label: t('dashboard.drillsStat'), sub: t('dashboard.thisWeek') },
            { value: streak, max: 7, color: 'rgba(251,191,36,0.95)', label: t('dashboard.streakStat'), sub: t('dashboard.days') },
            { value: goals.length, max: 5, color: 'rgba(52,211,153,0.95)', label: t('dashboard.goalsStat'), sub: t('dashboard.active') },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                <Ring value={s.value} max={s.max} color={s.color} size={72} strokeWidth={6} animated={animated} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--white)' }}>{s.value}</span>
                  <span style={{ fontSize: 10, color: 'var(--w50)', letterSpacing: '0.04em', marginTop: 1 }}>{t('dashboard.of')} {s.max}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)', letterSpacing: '-0.01em' }}>{s.label}</p>
                <p style={{ fontSize: 12, color: 'var(--w60)', marginTop: 2 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Next session ── */}
        {nextBooking && sessionDate ? (
          <div style={{
            background: 'var(--surface-1)',
            borderRadius: 24, padding: '1.75rem',
            marginBottom: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '0.625rem' }}>
                {t('dashboard.nextSession')}
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.375rem' }}>
                {nextBooking.coaches?.profiles?.name ?? 'Your coach'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--w40)' }}>
                {sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', background: 'rgba(255,48,64,0.1)', padding: '5px 12px', borderRadius: 50 }}>
                {countdown(nextBooking.starts_at, t('dashboard.now'))}
              </span>
              <Link to={`/session/${nextBooking.id}`} className="btn-primary"
                style={{ fontSize: 13, padding: '10px 22px', textDecoration: 'none' }}>
                {t('dashboard.join')}
              </Link>
            </div>
          </div>
        ) : (
          <Link to="/coaches" style={{
            display: 'block', textDecoration: 'none',
            background: 'var(--surface-1)', borderRadius: 24, padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '0.75rem' }}>
              {t('dashboard.nextSession')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 15, color: 'var(--w50)' }}>{t('dashboard.noUpcoming')}</p>
              <span className="btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>
                {t('dashboard.findCoach')}
              </span>
            </div>
          </Link>
        )}

        {/* ── Today tasks ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginBottom: '1rem' }}>
          <Link to="/drills" style={{ textDecoration: 'none' }}>
            <div style={{
              background: drillDoneToday ? 'transparent' : 'var(--surface-1)',
              border: drillDoneToday ? '0.5px solid var(--surface-border)' : 'none',
              borderRadius: 20, padding: '1.25rem',
              opacity: drillDoneToday ? 0.5 : 1, transition: 'opacity 0.4s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>{t('dashboard.drillLabel')}</p>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: drillDoneToday ? 'var(--red)' : 'var(--surface-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.3s',
                }}>
                  {drillDoneToday && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: drillDoneToday ? 'var(--w40)' : 'var(--white)' }}>
                {drillDoneToday ? t('dashboard.doneTodayDrill') : t('dashboard.trainFocus')}
              </p>
            </div>
          </Link>

          <Link to="/journal" style={{ textDecoration: 'none' }}>
            <div style={{
              background: journalDoneToday ? 'transparent' : 'var(--surface-1)',
              border: journalDoneToday ? '0.5px solid var(--surface-border)' : 'none',
              borderRadius: 20, padding: '1.25rem',
              opacity: journalDoneToday ? 0.5 : 1, transition: 'opacity 0.4s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>{t('dashboard.journalLabel')}</p>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: journalDoneToday ? 'var(--red)' : 'var(--surface-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.3s',
                }}>
                  {journalDoneToday && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: journalDoneToday ? 'var(--w40)' : 'var(--white)' }}>
                {journalDoneToday ? t('dashboard.entrySaved') : t('dashboard.writeToday')}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Goals ── */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 24, padding: '1.5rem 1.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>{t('dashboard.goalsStat')}</p>
            <Link to="/goals" style={{ fontSize: 13, color: 'var(--w50)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--w80)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--w50)')}>
              {t('dashboard.all')}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 3l3.5 3.5L5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>

          {goals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {goals.slice(0, 3).map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: HORIZON_COLOR[g.horizon] ?? 'var(--w30)' }} />
                  <span style={{ fontSize: 14, color: 'var(--w80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{g.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--w50)', flexShrink: 0 }}>{g.horizon}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--w40)' }}>{t('dashboard.goalsEmpty')}</p>
              <Link to="/goals" className="btn-primary" style={{ fontSize: 12, padding: '6px 16px', textDecoration: 'none', flexShrink: 0, marginLeft: 12 }}>{t('dashboard.add')}</Link>
            </div>
          )}
        </div>

        {/* ── Last journal entry ── */}
        {lastEntry && (
          <Link to="/journal" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ background: 'var(--surface-1)', borderRadius: 24, padding: '1.5rem 1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>{t('dashboard.recent')}</p>
                <p style={{ fontSize: 12, color: 'var(--w50)' }}>
                  {new Date(lastEntry.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p style={{
                fontSize: 14, color: 'var(--w60)', lineHeight: 1.65,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              }}>
                {journalText(lastEntry.body)}
              </p>
            </div>
          </Link>
        )}

      </div>
    </Layout>
  );
}
