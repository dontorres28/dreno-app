import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Result {
  drill_type: string;
  composite_score: number;
  raw_score: number;
  completed_at: string;
}

function TrendLine({ data, color = 'var(--red)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const W = 120, H = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        return i === data.length - 1
          ? <circle key={i} cx={x} cy={y} r="3" fill={color} />
          : null;
      })}
    </svg>
  );
}

const RED = 'var(--red)';

const DRILL_META: Record<string, { icon: React.ReactNode }> = {
  reaction: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v7h5l-5 9V11H5l5-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  goNoGo: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7.5 10l2 2L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  eyeTrack: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M2 10c2-4 4-6 8-6s6 2 8 6c-2 4-4 6-8 6s-6-2-8-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  sigh: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M2 13c1.5-3 3-5 5-5s3.5 4 5 4 3.5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 8c1 1 2 2 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
  },
};

function DrillCard({
  title,
  subtitle,
  to,
  results,
  unit,
  higherBetter = true,
  drillKey,
}: {
  title: string;
  subtitle: string;
  to: string;
  results: Result[];
  unit: string;
  higherBetter?: boolean;
  drillKey: keyof typeof DRILL_META;
}) {
  const { t } = useTranslation();
  const { icon } = DRILL_META[drillKey];
  const color = RED;
  const scores = results.map(r => r.composite_score);
  const last = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const delta = last !== undefined && prev !== undefined ? last - prev : null;
  const improved = delta !== null ? (higherBetter ? delta > 0 : delta < 0) : null;
  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (results.some(r => r.completed_at.slice(0, 10) === ds)) s++;
      else break;
    }
    return s;
  })();

  const hasResult = last !== undefined;

  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border)',
        borderTop: '1px solid rgba(255,48,64,0.35)',
        borderRadius: 20,
        padding: '1.25rem 1.25rem 1rem',
        transition: 'border-color 0.15s',
        cursor: 'pointer',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'rgba(255,48,64,0.08)', border: '0.5px solid rgba(255,48,64,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)',
            }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--w70)', lineHeight: 1 }}>
                {title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 3 }}>{subtitle}</p>
            </div>
          </div>
          {streak > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
              padding: '3px 9px', borderRadius: 50,
              background: 'rgba(255,48,64,0.08)', color: 'var(--red)', border: '0.5px solid rgba(255,48,64,0.2)',
              flexShrink: 0,
            }}>
              {streak}{t('drills.streak')}
            </span>
          )}
        </div>

        {/* Metric row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.125rem' }}>
          {hasResult ? (
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {drillKey === 'reaction' ? `${Math.round(results[results.length - 1].raw_score)}` : `${Math.round(last)}`}
                <span style={{ fontSize: 15, color: 'var(--w40)', marginLeft: 4 }}>{unit}</span>
              </p>
              {delta !== null && (
                <p style={{ fontSize: 12, color: improved ? '#22c55e' : '#f87171', marginTop: 3 }}>
                  {delta > 0 ? '+' : ''}{Math.round(Math.abs(delta))} from last
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--w30)', fontStyle: 'italic' }}>No results yet</p>
          )}
          {scores.length >= 2 && (
            <TrendLine
              data={drillKey === 'reaction' ? results.map(r => 100 - r.composite_score) : scores}
              color={improved === null ? 'var(--w30)' : improved ? 'var(--w50)' : 'var(--red)'}
            />
          )}
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--white)',
            background: 'var(--red)', padding: '8px 20px', borderRadius: 50,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {hasResult ? 'Run again' : 'Start drill'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          {hasResult && (
            <p style={{ fontSize: 12, color: 'var(--w40)' }}>
              {new Date(results[results.length - 1].completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function SighCard({ results }: { results: Result[] }) {
  const { t } = useTranslation();
  const { icon } = DRILL_META.sigh;
  const color = RED;
  const hasResult = results.length > 0;
  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (results.some(r => r.completed_at.slice(0, 10) === ds)) s++;
      else break;
    }
    return s;
  })();

  return (
    <Link to="/drills/sigh" style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border)',
        borderTop: '1px solid rgba(255,48,64,0.35)',
        borderRadius: 20,
        padding: '1.25rem 1.25rem 1rem',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'rgba(255,48,64,0.08)', border: '0.5px solid rgba(255,48,64,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)',
            }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--w70)', lineHeight: 1 }}>
                {t('drills.sigh')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 3 }}>{t('drills.sighSub')}</p>
            </div>
          </div>
          {streak > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 50, background: `${color}15`, color, border: `0.5px solid ${color}30`, flexShrink: 0 }}>
              {streak}{t('drills.streak')}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '1.125rem' }}>
          {hasResult ? (
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {results.length}
                <span style={{ fontSize: 15, color: 'var(--w40)', marginLeft: 4 }}>{t('drills.sessions')}</span>
              </p>
              <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 3 }}>
                Last: {new Date(results[results.length - 1].completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--w30)', fontStyle: 'italic' }}>No results yet</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--white)',
            background: 'var(--red)', padding: '8px 20px', borderRadius: 50,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {hasResult ? 'Run again' : 'Start drill'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

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

  const todayDone = results.some(r => r.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10));

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3.5rem 1.25rem 4rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.75rem' }}>
            {t('drills.title')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.03em' }}>
            {t('drills.subtitle')}
          </h1>
          {todayDone && (
            <p style={{ fontSize: 14, color: 'var(--w40)', marginTop: '0.75rem' }}>
              Today's drills done. Come back tomorrow.
            </p>
          )}
        </div>

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <DrillCard
              title={t('drills.reaction')}
              subtitle={t('drills.reactionSub')}
              to="/drills/reaction"
              results={rtResults}
              unit={t('drills.ms')}
              higherBetter={false}
              drillKey="reaction"
            />
            <DrillCard
              title={t('drills.goNoGo')}
              subtitle={t('drills.goNoGoSub')}
              to="/drills/go-no-go"
              results={gngResults}
              unit="%"
              higherBetter={true}
              drillKey="goNoGo"
            />
            <DrillCard
              title={t('drills.eyeTrack')}
              subtitle={t('drills.eyeTrackSub')}
              to="/drills/eye-track"
              results={etResults}
              unit={t('drills.ms')}
              higherBetter={false}
              drillKey="eyeTrack"
            />
            <SighCard results={sighResults} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            to="/drills/leaderboard"
            style={{ fontSize: 14, color: 'var(--w50)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {t('drills.leaderboard')}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
