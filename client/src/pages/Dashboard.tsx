import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import Tooltip from '../components/Tooltip';
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
  short: 'var(--red)',
  mid: 'rgba(255,48,64,0.55)',
  long: 'rgba(255,48,64,0.28)',
};

function WeekHero({ drillsThisWeek, streak, goalsCount, drillResults }: {
  drillsThisWeek: number; streak: number; goalsCount: number;
  drillResults: DrillResult[];
}) {
  const doneDays = new Set(drillResults.map(d => new Date(d.completed_at).toDateString()));
  const today = new Date();
  const todayDow = today.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = todayDow === 0 ? -6 : -(todayDow - 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      done: doneDays.has(d.toDateString()),
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
      borderRadius: 22,
      padding: 24,
      overflow: 'hidden',
    }}>
      {/* Ambient corner glow */}
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
            {drillsThisWeek}<span style={{ color: 'var(--w40)' }}>/5</span>
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--w70)', marginTop: 8 }}>
            {drillsThisWeek === 0 ? 'No sessions yet this week.' :
             drillsThisWeek >= 5 ? 'Weekly target hit. Keep going.' :
             `${drillsThisWeek} session${drillsThisWeek !== 1 ? 's' : ''} logged.`}
          </p>
        </div>

        {streak > 0 && (
          <Tooltip label={`${streak} day${streak !== 1 ? 's' : ''} in a row of training`} side="left">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 50,
              background: 'rgba(255,48,64,0.14)',
              border: '0.5px solid rgba(255,48,64,0.30)',
              cursor: 'help', flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--red)">
                <path d="M6 1c1 2 3 3 3 5.5S7.5 11 6 11s-3-2-3-4.5C3 5 4 4 6 1z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.02em' }}>
                {streak}-day streak
              </span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* Week — one round chip per day, richer visual */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', marginBottom: 4 }}>
        {days.map((d, i) => (
          <Tooltip key={i} label={d.done ? `Trained · ${d.date}` : d.isToday ? "Today · nothing yet" : `Rest · ${d.date}`} side="top">
            <div style={{
              flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'help',
            }}>
              {/* Day letter */}
              <span style={{
                fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
                color: d.isToday ? 'var(--red)' : d.done ? 'var(--w70)' : 'var(--w50)',
              }}>
                {d.label}
              </span>

              {/* Circle chip with date inside */}
              <div style={{
                position: 'relative',
                width: '100%', aspectRatio: '1 / 1',
                maxWidth: 44, minHeight: 32,
                borderRadius: '50%',
                background: d.isToday ? 'var(--nav-active-bg)' : d.done ? 'var(--red)' : 'transparent',
                border: d.isToday || d.done ? 'none' : '0.5px solid var(--surface-border-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: d.done && !d.isToday ? '0 2px 12px rgba(255,48,64,0.28)' : 'none',
                transition: 'background 400ms cubic-bezier(0.23, 1, 0.32, 1), border-color 400ms, box-shadow 400ms',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1,
                  color: d.isToday ? 'var(--nav-active-color)' : d.done ? '#fff' : 'var(--w60)',
                }}>
                  {d.date}
                </span>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Goal count line */}
      {goalsCount > 0 && (
        <p style={{
          marginTop: 18, paddingTop: 14, position: 'relative',
          borderTop: '0.5px solid var(--surface-border)',
          fontSize: 13, color: 'var(--w70)',
        }}>
          <span style={{ color: 'var(--white)', fontWeight: 700 }}>{goalsCount}</span> active goal{goalsCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
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
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [drillResults, setDrillResults] = useState<DrillResult[]>([]);
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
            .order('starts_at'),
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
        setAllBookings(bookRes.data ?? []);
        setGoals(goalRes.data ?? []);
        const drills: DrillResult[] = drillRes.data ?? [];
        setDrillResults(drills);
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
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '0.375rem', letterSpacing: '0.02em', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 8vw, 4.5rem)', lineHeight: 0.92, letterSpacing: '-0.04em' }}>
            {firstName ? `${t('dashboard.hi')}, ${firstName}.` : t('nav.dashboard')}
          </h1>
        </div>

        {/* ── Week hero ── */}
        <div style={{ marginBottom: '1rem' }}>
          <WeekHero
            drillsThisWeek={drillsThisWeek}
            streak={streak}
            goalsCount={goals.length}
            drillResults={drillResults}
          />
        </div>


        {/* ── Next session ── */}
        {nextBooking && sessionDate ? (
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
                {t('dashboard.nextSession')}
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.035em', lineHeight: 1, marginBottom: '0.375rem', color: 'var(--white)' }}>
                {nextBooking.coaches?.profiles?.name ?? 'Your coach'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--w70)' }}>
                {sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', background: 'rgba(255,48,64,0.14)', border: '0.5px solid rgba(255,48,64,0.30)', padding: '5px 12px', borderRadius: 50, letterSpacing: '0.02em' }}>
                {countdown(nextBooking.starts_at, t('dashboard.now'))}
              </span>
              <Link to={`/session/${nextBooking.id}`} className="btn-primary" style={{ fontSize: 13, minHeight: 40, padding: '0 22px', textDecoration: 'none' }}>
                {t('dashboard.join')}
              </Link>
            </div>
          </div>
        ) : (
          <Link to="/coaches" style={{
            display: 'block', textDecoration: 'none',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 22, padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)', marginBottom: '0.75rem' }}>
              {t('dashboard.nextSession')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 15, color: 'var(--w70)' }}>{t('dashboard.noUpcoming')}</p>
              <span className="btn-primary" style={{ fontSize: 13, minHeight: 40, padding: '0 20px' }}>
                {t('dashboard.findCoach')}
              </span>
            </div>
          </Link>
        )}

        {/* ── Today tasks ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginBottom: '1rem' }}>
          {[
            { to: '/drills', label: t('dashboard.drillLabel'), done: drillDoneToday, doneText: t('dashboard.doneTodayDrill'), todoText: t('dashboard.trainFocus') },
            { to: '/journal', label: t('dashboard.journalLabel'), done: journalDoneToday, doneText: t('dashboard.entrySaved'), todoText: t('dashboard.writeToday') },
          ].map(task => (
            <Link key={task.to} to={task.to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--surface-1)',
                border: '0.5px solid var(--surface-border-2)',
                borderRadius: 18, padding: '1.25rem',
                opacity: task.done ? 0.7 : 1,
                transition: 'opacity 220ms cubic-bezier(0.23, 1, 0.32, 1), border-color 220ms, background 220ms',
              }}
              onMouseEnter={e => { if (!task.done) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-2)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border-2)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: task.done ? 'var(--red)' : 'var(--w60)' }}>{task.label}</p>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: task.done ? 'var(--red)' : 'transparent',
                    border: task.done ? 'none' : '1.5px solid var(--w40)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 260ms cubic-bezier(0.4, 0, 0.2, 1), border-color 260ms',
                  }}>
                    {task.done && <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.2 2.2L8 2.6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: task.done ? 'var(--w60)' : 'var(--white)', textDecoration: task.done ? 'line-through' : 'none', textDecorationColor: 'var(--w40)' }}>
                  {task.done ? task.doneText : task.todoText}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Goals ── */}
        <div style={{
          background: 'var(--surface-1)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 22, padding: '1.5rem 1.75rem', marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>{t('dashboard.goalsStat')}</p>
            <Link to="/goals" style={{ fontSize: 13, color: 'var(--w70)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 200ms cubic-bezier(0.23, 1, 0.32, 1)', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--w70)')}>
              {t('dashboard.all')}
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M5 3l3.5 3.5L5 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>

          {goals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {goals.slice(0, 3).map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tooltip label={`${g.horizon.charAt(0).toUpperCase() + g.horizon.slice(1)}-term goal`} side="right">
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: HORIZON_COLOR[g.horizon] ?? 'var(--w40)', cursor: 'help' }} />
                  </Tooltip>
                  <span style={{ fontSize: 14, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{g.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--w60)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{g.horizon}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--w70)' }}>{t('dashboard.goalsEmpty')}</p>
              <Link to="/goals" className="btn-primary" style={{ fontSize: 12, minHeight: 34, padding: '0 16px', textDecoration: 'none', flexShrink: 0 }}>{t('dashboard.add')}</Link>
            </div>
          )}
        </div>

        {/* ── Last journal entry ── */}
        {lastEntry && (
          <Link to="/journal" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'var(--surface-1)',
              border: '0.5px solid var(--surface-border-2)',
              borderRadius: 22, padding: '1.5rem 1.75rem',
              transition: 'background 220ms cubic-bezier(0.23, 1, 0.32, 1), border-color 220ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border-2)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>{t('dashboard.recent')}</p>
                <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '0.02em' }}>
                  {new Date(lastEntry.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p style={{
                fontSize: 14, color: 'var(--w80)', lineHeight: 1.65,
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
