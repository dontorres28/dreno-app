import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Tooltip from '../components/Tooltip';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Result {
  drill_type: string;
  composite_score: number;
  raw_score: number;
  completed_at: string;
}

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

function streakDays(results: Result[]): number {
  let s = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (results.some(r => r.completed_at.slice(0, 10) === ds)) s++;
    else break;
  }
  return s;
}

function Delta({ current, previous, unit, lowerIsBetter }: { current: number; previous: number; unit: string; lowerIsBetter: boolean }) {
  const diff = current - previous;
  if (diff === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '0.02em', fontWeight: 500 }}>
        Same as last
      </p>
    );
  }
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const abs = Math.abs(Math.round(diff));
  return (
    <p style={{
      fontSize: 12, fontWeight: 600, letterSpacing: '0.01em',
      color: better ? 'var(--red)' : 'var(--w60)',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <span aria-hidden style={{
        display: 'inline-block',
        borderLeft: '3px solid transparent',
        borderRight: '3px solid transparent',
        borderTop: better === lowerIsBetter ? 'none' : `4px solid currentColor`,
        borderBottom: better === lowerIsBetter ? `4px solid currentColor` : 'none',
      }} />
      {abs}{unit} {better ? 'better' : 'off'} than last
    </p>
  );
}

interface DrillProps {
  title: string;
  subtitle: string;
  to: string;
  color: string;
  visual: React.ReactNode;
  metric: React.ReactNode;
  done: boolean;
  isNew: boolean;
}

function DrillTile({ title, subtitle, to, visual, metric, done, isNew }: DrillProps) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div
        style={{
          position: 'relative',
          background: 'var(--surface-1)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 22,
          padding: 24,
          height: '100%', minHeight: 260,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transition: `background 220ms ${EASE}, border-color 220ms ${EASE}, transform 200ms ${EASE}`,
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-hover)';
          el.style.borderColor = 'var(--line-2)';
          el.style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-1)';
          el.style.borderColor = 'var(--surface-border-2)';
          el.style.transform = 'translateY(0)';
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,48,64,0.16) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24, position: 'relative' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 6 }}>
              {done ? 'Done today' : isNew ? 'New' : 'Practice'}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.03em', color: 'var(--white)' }}>
              {title}
            </p>
          </div>
          <div style={{ width: 56, height: 56, flexShrink: 0, opacity: 0.95 }}>
            {visual}
          </div>
        </div>

        {/* Metric block */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ marginBottom: 16 }}>
            {metric}
          </div>
          <p style={{ fontSize: 13, color: 'var(--w70)', lineHeight: 1.5, marginBottom: 14 }}>
            {subtitle}
          </p>
          <div style={{
            display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
            color: 'var(--red)', fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em',
          }}>
            {isNew ? 'Start now' : 'Run again'}
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Signature visuals per drill ─────────────────────────────────────────
function ReactionVisual() {
  return (
    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #ff5566 0%, #FF3040 55%, #cc1e2c 100%)', boxShadow: '0 0 24px rgba(255,48,64,0.35)' }} />
  );
}
function GoNoGoVisual() {
  return (
    <svg viewBox="0 0 56 56" style={{ display: 'block' }}>
      <circle cx="20" cy="28" r="14" fill="var(--white)" opacity="0.9"/>
      <circle cx="42" cy="28" r="14" fill="#FF3040"/>
    </svg>
  );
}
function FocusVisual() {
  return (
    <svg viewBox="0 0 56 56" style={{ display: 'block' }}>
      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--w40)" strokeWidth="1" strokeDasharray="2 3"/>
      <circle cx="28" cy="28" r="6" fill="#FF3040">
        <animate attributeName="cx" values="12;44;28;12" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="28;28;44;28" dur="4s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}
function BreathingVisual() {
  return (
    <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', width: 56, height: 56, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,48,64,0.25) 0%, transparent 70%)',
      }} />
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #ff5566 0%, #FF3040 55%, #cc1e2c 100%)',
        animation: 'trainBreathe 3.5s ease-in-out infinite',
      }} />
      <style>{`@keyframes trainBreathe { 0%,100% { transform: scale(0.7); } 50% { transform: scale(1); } }`}</style>
    </div>
  );
}

// ── Big metric renderers ────────────────────────────────────────────────
function BigMetric({ value, unit }: { value: string | null; unit: string }) {
  if (value === null) {
    return <p style={{ fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 0.9, letterSpacing: '-0.045em', color: 'var(--w50)' }}>—</p>;
  }
  return (
    <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 0.9, letterSpacing: '-0.045em', color: 'var(--white)' }}>
      {value}<span style={{ fontSize: 16, color: 'var(--w60)', marginLeft: 5, letterSpacing: '0.02em' }}>{unit}</span>
    </p>
  );
}

function MetricWithDelta({ value, unit, prev, lowerIsBetter }: { value: number | null; unit: string; prev: number | null; lowerIsBetter: boolean }) {
  return (
    <div>
      <BigMetric value={value !== null ? String(Math.round(value)) : null} unit={unit} />
      {value !== null && prev !== null && (
        <div style={{ marginTop: 6 }}>
          <Delta current={value} previous={prev} unit={unit} lowerIsBetter={lowerIsBetter} />
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────
export default function Drills() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('drill_results')
      .select('drill_type, composite_score, raw_score, completed_at')
      .eq('athlete_id', user.id)
      .order('completed_at', { ascending: true })
      .then(({ data }) => { setResults(data ?? []); setLoading(false); });
  }, [user]);

  const rtResults   = results.filter(r => r.drill_type === 'reaction_time');
  const gngResults  = results.filter(r => r.drill_type === 'go_no_go');
  const etResults   = results.filter(r => r.drill_type === 'eye_track');
  const sighResults = results.filter(r => r.drill_type === 'the_sigh');

  const today = new Date().toISOString().slice(0, 10);
  const doneTodaySet = new Set(results.filter(r => r.completed_at.slice(0, 10) === today).map(r => r.drill_type));
  const doneToday = doneTodaySet.size;

  const overallStreak = (() => {
    let s = 0;
    const t = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(t);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (results.some(r => r.completed_at.slice(0, 10) === ds)) s++;
      else break;
    }
    return s;
  })();

  const drills = [
    { key: 'reaction_time', label: 'Reaction' },
    { key: 'go_no_go', label: 'Go/No-go' },
    { key: 'eye_track', label: 'Focus' },
    { key: 'the_sigh', label: 'Breathing' },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 7vw, 4.5rem)', lineHeight: 0.92, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
            Train the head game
          </h1>
          <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.5, maxWidth: 520 }}>
            Four short drills. Ten minutes a day is enough.
          </p>
        </div>

        {/* ── Today card — session progress ── */}
        {!loading && (
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(255,48,64,0.10) 0%, rgba(255,48,64,0.02) 100%)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 22,
            padding: 24,
            marginBottom: 14,
            overflow: 'hidden',
          }}>
            {/* Right-side glow */}
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 240, height: 240, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,48,64,0.22) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, position: 'relative', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 200 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w70)', marginBottom: 10 }}>
                  Today
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 6vw, 4rem)', lineHeight: 0.9, letterSpacing: '-0.045em' }}>
                  {doneToday}<span style={{ color: 'var(--w40)' }}>/4</span>
                </p>
                <p style={{ fontSize: 13.5, color: 'var(--w70)', marginTop: 8 }}>
                  {doneToday === 0 ? "Let's get started." :
                   doneToday === 4 ? "Full set. That's a good day." :
                   doneToday === 1 ? '1 drill done, 3 to go.' :
                   `${doneToday} drills done, ${4 - doneToday} to go.`}
                </p>
              </div>

              {/* Streak + progress dots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-end' }}>
                {overallStreak > 0 && (
                  <Tooltip label={`${overallStreak} day${overallStreak !== 1 ? 's' : ''} in a row of training`} side="left">
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 50,
                      background: 'rgba(255,48,64,0.14)',
                      border: '0.5px solid rgba(255,48,64,0.30)',
                      cursor: 'help',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--red)">
                        <path d="M6 1c1 2 3 3 3 5.5S7.5 11 6 11s-3-2-3-4.5C3 5 4 4 6 1z"/>
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.02em' }}>
                        {overallStreak}-day streak
                      </span>
                    </div>
                  </Tooltip>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  {drills.map(d => (
                    <Tooltip key={d.key} label={`${d.label} · ${doneTodaySet.has(d.key) ? 'done today' : 'not yet'}`} side="top">
                      <span style={{
                        display: 'inline-block',
                        width: 34, height: 6, borderRadius: 6,
                        background: doneTodaySet.has(d.key) ? 'var(--red)' : 'var(--surface-border-2)',
                        transition: `background 400ms ${EASE}`,
                        cursor: 'help',
                      }} />
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Drill tiles ── */}
        {!loading && (
          <div className="drills-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 14,
            marginBottom: '2rem',
          }}>
            <DrillTile
              title="Reaction"
              subtitle="Test and train your response speed."
              to="/drills/reaction"
              color="var(--red)"
              visual={<ReactionVisual />}
              done={doneTodaySet.has('reaction_time')}
              isNew={rtResults.length === 0}
              metric={
                <MetricWithDelta
                  value={rtResults.length > 0 ? rtResults[rtResults.length - 1].raw_score : null}
                  unit="ms"
                  prev={rtResults.length >= 2 ? rtResults[rtResults.length - 2].raw_score : null}
                  lowerIsBetter
                />
              }
            />

            <DrillTile
              title="Go / No-go"
              subtitle="Train inhibitory control under pressure."
              to="/drills/go-no-go"
              color="var(--red)"
              visual={<GoNoGoVisual />}
              done={doneTodaySet.has('go_no_go')}
              isNew={gngResults.length === 0}
              metric={
                <MetricWithDelta
                  value={gngResults.length > 0 ? gngResults[gngResults.length - 1].composite_score : null}
                  unit="%"
                  prev={gngResults.length >= 2 ? gngResults[gngResults.length - 2].composite_score : null}
                  lowerIsBetter={false}
                />
              }
            />

            <DrillTile
              title="Focus"
              subtitle="Hold your focus on a moving target."
              to="/drills/eye-track"
              color="var(--red)"
              visual={<FocusVisual />}
              done={doneTodaySet.has('eye_track')}
              isNew={etResults.length === 0}
              metric={
                <BigMetric
                  value={etResults.length > 0 ? `L${Math.round(etResults[etResults.length - 1].composite_score)}` : null}
                  unit=""
                />
              }
            />

            <DrillTile
              title="Breathing"
              subtitle="Reset your nervous system in 40 seconds."
              to="/drills/sigh"
              color="var(--red)"
              visual={<BreathingVisual />}
              done={doneTodaySet.has('the_sigh')}
              isNew={sighResults.length === 0}
              metric={
                <BigMetric
                  value={sighResults.length > 0 ? String(sighResults.length) : null}
                  unit={sighResults.length === 1 ? 'session' : 'sessions'}
                />
              }
            />
          </div>
        )}

        <style>{`
          @media (max-width: 640px) {
            .drills-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* ── Footer link ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            to="/drills/leaderboard"
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--w70)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 50,
              border: '0.5px solid var(--surface-border-2)',
              background: 'var(--surface-1)',
              textDecoration: 'none',
              transition: `border-color 200ms ${EASE}, color 200ms ${EASE}, background 200ms ${EASE}`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--line-2)';
              el.style.color = 'var(--white)';
              el.style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--surface-border-2)';
              el.style.color = 'var(--w70)';
              el.style.background = 'var(--surface-1)';
            }}
          >
            Leaderboard
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
