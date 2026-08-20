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
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <Link
          to="/drills"
          style={{ fontSize: 13, color: 'var(--w40)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '2.5rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3M6 10L3 7l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('common.back')}
        </Link>

        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1rem' }}>
          Last 7 days
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '3rem' }}>
          {t('drillLeaderboard.title')}
        </h1>

        {myRank > 0 && (
          <div
            style={{
              background: 'rgba(255,48,64,0.08)',
              border: '0.5px solid rgba(255,48,64,0.20)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--w60)' }}>{t('drillLeaderboard.rank')}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-0.02em', color: 'var(--red)' }}>
              #{myRank}
            </p>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--w40)', fontSize: 15 }}>{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ fontSize: 16, color: 'var(--w40)', marginBottom: '1.5rem' }}>
              {t('drillLeaderboard.noData')}
            </p>
            <Link to="/drills/reaction" className="btn-primary" style={{ fontSize: 14, padding: '12px 28px' }}>
              Be first
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5px', background: 'var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            {entries.map((e, i) => {
              const isMe = e.athlete_id === user?.id;
              return (
                <div
                  key={e.athlete_id}
                  style={{
                    background: isMe ? 'rgba(255,48,64,0.06)' : 'var(--bg-1)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: i < 3 ? 20 : 16,
                      letterSpacing: '-0.02em',
                      color: i === 0 ? '#f59e0b' : i === 1 ? 'var(--w60)' : i === 2 ? '#cd7c3a' : 'var(--w40)',
                      width: 32,
                      flexShrink: 0,
                      textAlign: 'center',
                    }}
                  >
                    {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : `${i + 1}`}
                  </span>

                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--surface-border)',
                      border: '0.5px solid var(--surface-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--w60)',
                      flexShrink: 0,
                    }}
                  >
                    {e.name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: isMe ? 600 : 400 }}>
                      {e.name}{isMe ? ' (you)' : ''}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 2 }}>
                      {e.sessions} session{e.sessions !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      letterSpacing: '-0.02em',
                      color: isMe ? 'var(--red)' : 'var(--white)',
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
