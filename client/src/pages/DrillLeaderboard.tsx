import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Entry {
  athlete_id: string;
  name: string;
  avg_composite: number;
  sessions: number;
}

export default function DrillLeaderboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const { data } = await supabase
        .from('drill_results')
        .select('athlete_id, composite_score, profiles!drill_results_athlete_id_fkey(name)')
        .gte('completed_at', since.toISOString());

      if (!data) { setLoading(false); return; }

      const map = new Map<string, { name: string; scores: number[] }>();
      for (const row of data) {
        const name = (row.profiles as any)?.name ?? 'Athlete';
        if (!map.has(row.athlete_id)) map.set(row.athlete_id, { name, scores: [] });
        map.get(row.athlete_id)!.scores.push(row.composite_score);
      }

      const ranked = Array.from(map.entries())
        .map(([id, { name, scores }]) => ({
          athlete_id: id,
          name,
          avg_composite: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          sessions: scores.length,
        }))
        .sort((a, b) => b.avg_composite - a.avg_composite);

      setEntries(ranked);
      setLoading(false);
    }
    load();
  }, []);

  const myRank = entries.findIndex(e => e.athlete_id === user?.id) + 1;

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
        <Link
          to="/drills"
          style={{ fontSize: 13, color: 'var(--w70)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem', textDecoration: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3M6 10L3 7l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('common.back')}
        </Link>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '0.5rem' }}>
          {t('drillLeaderboard.title')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--w70)', marginBottom: '2rem' }}>Last 7 days</p>

        {myRank > 0 && (
          <div
            style={{
              background: 'var(--red)',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.005em' }}>{t('drillLeaderboard.rank')}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
              #{myRank}
            </p>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--w60)', fontSize: 15 }}>{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ fontSize: 16, color: 'var(--w70)', marginBottom: '1.5rem' }}>
              {t('drillLeaderboard.noData')}
            </p>
            <Link to="/drills/reaction" className="btn-primary">
              Be first
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {entries.map((e, i) => {
              const isMe = e.athlete_id === user?.id;
              const isTop3 = i < 3;
              return (
                <div
                  key={e.athlete_id}
                  style={{
                    background: isMe ? 'rgba(255,48,64,0.08)' : 'transparent',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    borderBottom: i < entries.length - 1 ? '0.5px solid var(--surface-border)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: isTop3 ? 22 : 18,
                      letterSpacing: '-0.02em',
                      color: isTop3 ? 'var(--red)' : 'var(--w60)',
                      width: 32,
                      flexShrink: 0,
                      textAlign: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {i + 1}
                  </span>

                  <div
                    style={{
                      width: 38, height: 38,
                      borderRadius: '50%',
                      background: 'var(--surface-2)',
                      border: '0.5px solid var(--surface-border-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--w80)',
                      flexShrink: 0,
                    }}
                  >
                    {e.name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14.5, fontWeight: isMe ? 700 : 500, color: 'var(--white)' }}>
                      {e.name}{isMe ? ' (you)' : ''}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--w60)', marginTop: 2 }}>
                      {e.sessions} session{e.sessions !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      letterSpacing: '-0.02em',
                      color: isMe ? 'var(--red)' : 'var(--white)',
                      lineHeight: 1,
                    }}
                  >
                    {e.avg_composite}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
