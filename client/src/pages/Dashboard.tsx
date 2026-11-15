import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, VideoCamera, Barbell, NotePencil, ArrowRight, Check } from '@phosphor-icons/react';
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
  mid: 'rgba(77,166,255,0.55)',
  long: 'rgba(77,166,255,0.28)',
};

function WeekHero({ drillsThisWeek, streak, drillResults }: {
  drillsThisWeek: number; streak: number;
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

  const caption =
    drillsThisWeek === 0 ? 'No sessions yet this week.' :
    drillsThisWeek >= 5 ? 'Weekly target hit. Keep going.' :
    `${drillsThisWeek} session${drillsThisWeek !== 1 ? 's' : ''} logged.`;

  return (
    <div className="squircle" style={{
      position: 'relative',
      background: 'var(--surface-1)',
      border: '0.5px solid var(--surface-border-2)',
      borderRadius: 28,
      padding: 'clamp(22px, 5vw, 32px)',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 11vw, 5.5rem)', lineHeight: 0.82, letterSpacing: '-0.05em' }}>
            {drillsThisWeek}<span style={{ color: 'var(--w40)' }}>/5</span>
          </p>
          <p style={{ fontSize: 14, color: 'var(--w70)', marginTop: 10 }}>{caption}</p>
        </div>

        {streak > 0 && (
          <Tooltip label={`${streak} day${streak !== 1 ? 's' : ''} in a row of training`} side="left">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 13px', borderRadius: 50,
              background: 'rgba(77,166,255,0.16)',
              border: '0.5px solid rgba(77,166,255,0.32)',
              cursor: 'help', flexShrink: 0,
            }}>
              <Flame size={14} weight="fill" color="var(--accent)" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-strong)', letterSpacing: '0.01em' }}>
                {streak}
              </span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* 7-day ring */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', marginTop: 26 }}>
        {days.map((d, i) => (
          <Tooltip key={i} label={d.done ? `Trained ${d.date}` : d.isToday ? 'Today, nothing yet' : `Rest ${d.date}`} side="top">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, cursor: 'help' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.06em', fontWeight: 700, color: d.isToday ? 'var(--accent-strong)' : d.done ? 'var(--w70)' : 'var(--w45)' }}>
                {d.label}
              </span>
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 46, minHeight: 32,
                borderRadius: '50%',
                background: d.isToday ? 'var(--nav-active-bg)' : d.done ? 'var(--accent)' : 'transparent',
                border: d.isToday || d.done ? 'none' : '1px solid var(--surface-border-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 400ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1,
                  color: d.isToday ? 'var(--nav-active-color)' : d.done ? 'var(--btn-ink)' : 'var(--w60)',
                }}>
                  {d.date}
                </span>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
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

        {/* ── Week hero, the single accent moment of the page ── */}
        <div style={{ marginBottom: 'clamp(2rem, 5vh, 3rem)' }}>
          <WeekHero drillsThisWeek={drillsThisWeek} streak={streak} drillResults={drillResults} />
        </div>

        {/* ── Next session, the one actionable card. Solid, no competing glow. ── */}
        {nextBooking && sessionDate ? (
          <div className="squircle reveal" style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 24, padding: '1.5rem 1.625rem',
            marginBottom: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                background: 'rgba(77,166,255,0.14)', border: '0.5px solid rgba(77,166,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <VideoCamera size={22} weight="fill" color="var(--accent)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.25rem, 3.5vw, 1.625rem)', letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextBooking.coaches?.profiles?.name ?? 'Your coach'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--w70)', marginTop: 3 }}>
                  {sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {', '}
                  {sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 9, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-strong)', background: 'rgba(77,166,255,0.14)', border: '0.5px solid rgba(77,166,255,0.30)', padding: '4px 11px', borderRadius: 50 }}>
                {countdown(nextBooking.starts_at, t('dashboard.now'))}
              </span>
              <Link to={`/session/${nextBooking.id}`} className="btn-primary" style={{ fontSize: 13.5, minHeight: 42, padding: '0 22px', textDecoration: 'none' }}>
                {t('dashboard.join')}
              </Link>
            </div>
          </div>
        ) : (
          <Link to="/coaches" className="squircle reveal" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            textDecoration: 'none',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
            borderRadius: 24, padding: '1.5rem 1.625rem', marginBottom: '1rem',
          }}>
            <p style={{ fontSize: 15, color: 'var(--w70)' }}>{t('dashboard.noUpcoming')}</p>
            <span className="btn-primary" style={{ fontSize: 13, minHeight: 40, padding: '0 20px' }}>
              {t('dashboard.findCoach')}
            </span>
          </Link>
        )}

        {/* ── Today, two large action tiles ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 reveal" style={{ marginBottom: 'clamp(1.5rem, 4vh, 2.25rem)' }}>
          {[
            { to: '/drills', Icon: Barbell, label: t('dashboard.drillLabel'), done: drillDoneToday, doneText: t('dashboard.doneTodayDrill'), todoText: t('dashboard.trainFocus') },
            { to: '/journal', Icon: NotePencil, label: t('dashboard.journalLabel'), done: journalDoneToday, doneText: t('dashboard.entrySaved'), todoText: t('dashboard.writeToday') },
          ].map(task => (
            <Link key={task.to} to={task.to} className="squircle" style={{
              textDecoration: 'none',
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
              borderRadius: 20, padding: '1.375rem',
              opacity: task.done ? 0.72 : 1,
              transition: 'opacity 220ms cubic-bezier(0.23, 1, 0.32, 1), border-color 220ms, background 220ms',
            }}
            onMouseEnter={e => { if (!task.done) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-2)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border-2)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <task.Icon size={24} weight="duotone" color={task.done ? 'var(--accent)' : 'var(--w70)'} />
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: task.done ? 'var(--accent)' : 'transparent',
                  border: task.done ? 'none' : '1.5px solid var(--w40)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 260ms cubic-bezier(0.4, 0, 0.2, 1), border-color 260ms',
                }}>
                  {task.done && <Check size={13} weight="bold" color="var(--btn-ink)" />}
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', color: task.done ? 'var(--accent-strong)' : 'var(--w60)', marginBottom: 5 }}>{task.label}</p>
              <p style={{ fontSize: 14.5, fontWeight: 500, color: task.done ? 'var(--w60)' : 'var(--white)', textDecoration: task.done ? 'line-through' : 'none', textDecorationColor: 'var(--w40)' }}>
                {task.done ? task.doneText : task.todoText}
              </p>
            </Link>
          ))}
        </div>

        {/* ── Goals, quiet section, hairline not a box ── */}
        <div className="reveal" style={{ marginBottom: 'clamp(1.5rem, 4vh, 2.25rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 14, borderBottom: '0.5px solid var(--surface-border)', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em', color: 'var(--w60)' }}>{t('dashboard.goalsStat')}</p>
            <Link to="/goals" style={{ fontSize: 13, color: 'var(--link)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              {t('dashboard.all')}
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          {goals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {goals.slice(0, 3).map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tooltip label={`${g.horizon.charAt(0).toUpperCase() + g.horizon.slice(1)}-term goal`} side="right">
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: HORIZON_COLOR[g.horizon] ?? 'var(--w40)', cursor: 'help' }} />
                  </Tooltip>
                  <span style={{ fontSize: 14.5, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{g.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--w60)', flexShrink: 0, letterSpacing: '0.06em', fontWeight: 600 }}>{g.horizon}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 14.5, color: 'var(--w70)' }}>{t('dashboard.goalsEmpty')}</p>
              <Link to="/goals" className="btn-primary" style={{ fontSize: 12, minHeight: 34, padding: '0 16px', textDecoration: 'none', flexShrink: 0 }}>{t('dashboard.add')}</Link>
            </div>
          )}
        </div>

        {/* ── Recent reflection, quiet row ── */}
        {lastEntry && (
          <Link to="/journal" className="reveal" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ paddingBottom: 14, borderBottom: '0.5px solid var(--surface-border)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em', color: 'var(--w60)' }}>{t('dashboard.recent')}</p>
              <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '0.02em' }}>
                {new Date(lastEntry.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <p style={{
              fontSize: 14.5, color: 'var(--w80)', lineHeight: 1.65,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            }}>
              {journalText(lastEntry.body)}
            </p>
          </Link>
        )}

      </div>
    </Layout>
  );
}
