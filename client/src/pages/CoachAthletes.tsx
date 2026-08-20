import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { apiGet } from '../lib/api';

interface Athlete {
  id: string;
  name: string;
  sport: string | null;
  competition_level: string | null;
  country: string | null;
  languages: string[];
  birth_date: string | null;
  latest_booking_status: string | null;
  latest_booking_at: string | null;
}

function age(birth_date: string | null): string {
  if (!birth_date) return '';
  const diff = Date.now() - new Date(birth_date).getTime();
  return String(Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'rgba(52,211,153,0.8)',
  pending: 'rgba(251,191,36,0.8)',
  completed: 'var(--w40)',
};

export default function CoachAthletes() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiGet('/api/coach/athletes')
      .then(setAthletes)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2.5rem' }}>
          Athletes
        </h1>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>}
        {err && <p style={{ fontSize: 14, color: 'var(--red)' }}>{err}</p>}

        {!loading && athletes.length === 0 && (
          <div style={{ paddingTop: '2rem' }}>
            <p style={{ fontSize: 15, color: 'var(--w40)' }}>No athletes yet.</p>
            <p style={{ fontSize: 13, color: 'var(--w40)', marginTop: 6 }}>Athletes appear here once they book a session with you.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5px' }}>
          {athletes.map((a, i) => (
            <Link
              key={a.id}
              to={`/coach/athletes/${a.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 0',
                borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'var(--surface-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700,
              }}>
                {(a.name ?? '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: 3 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{a.name ?? 'Unknown'}</p>
                  {age(a.birth_date) && (
                    <span style={{ fontSize: 12, color: 'var(--w40)' }}>{age(a.birth_date)} y/o</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {a.sport && <span style={{ fontSize: 12, color: 'var(--w40)' }}>{a.sport}</span>}
                  {a.sport && a.competition_level && <span style={{ fontSize: 12, color: 'var(--w20)' }}>·</span>}
                  {a.competition_level && <span style={{ fontSize: 12, color: 'var(--w40)' }}>{a.competition_level}</span>}
                  {a.country && <span style={{ fontSize: 12, color: 'var(--w20)' }}>·</span>}
                  {a.country && <span style={{ fontSize: 12, color: 'var(--w40)' }}>{a.country}</span>}
                  {a.languages.length > 0 && (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--w20)' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--w40)' }}>{a.languages.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status + arrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {a.latest_booking_status && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: STATUS_COLOR[a.latest_booking_status] ?? 'var(--w20)',
                  }} />
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="var(--w40)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
