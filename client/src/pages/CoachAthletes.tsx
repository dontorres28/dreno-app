import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
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

function age(birth_date: string | null): number | null {
  if (!birth_date) return null;
  const diff = Date.now() - new Date(birth_date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function lastSessionLabel(iso: string | null): string {
  if (!iso) return 'No sessions yet';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 0 && diffDays > -7) return `in ${-diffDays}d`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

type Filter = 'all' | 'active' | 'past';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

export default function CoachAthletes() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    apiGet('/api/coach/athletes')
      .then(setAthletes)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = useMemo(
    () => athletes.filter(a => a.latest_booking_status === 'confirmed').length,
    [athletes]
  );
  const pastCount = useMemo(
    () => athletes.filter(a => a.latest_booking_status === 'completed').length,
    [athletes]
  );

  const filtered = useMemo(() => {
    if (filter === 'active') return athletes.filter(a => a.latest_booking_status === 'confirmed');
    if (filter === 'past') return athletes.filter(a => a.latest_booking_status === 'completed');
    return athletes;
  }, [athletes, filter]);

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)',
            lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 8,
          }}>
            My athletes
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
            {athletes.length === 0
              ? 'No athletes yet.'
              : `${athletes.length} total · ${activeCount} active · ${pastCount} past`}
          </p>
        </div>

        {/* Filter pills */}
        {athletes.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem' }}>
            <LayoutGroup id="roster-filter">
              {FILTERS.map(f => {
                const on = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      position: 'relative',
                      fontSize: 13, fontWeight: on ? 700 : 500,
                      padding: '8px 16px', borderRadius: 50,
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: on ? '#fff' : 'var(--w70)',
                      fontFamily: 'var(--font-body)',
                      transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    {on && (
                      <motion.span
                        layoutId="roster-filter-pill"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                        style={{ position: 'absolute', inset: 0, background: 'var(--red)', borderRadius: 50, zIndex: 0 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
                  </button>
                );
              })}
            </LayoutGroup>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
            <Spinner size={28} />
          </div>
        )}

        {err && <p style={{ fontSize: 14, color: 'var(--red)' }}>{err}</p>}

        {!loading && athletes.length === 0 && (
          <div style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 20, padding: '2.5rem 1.5rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 15, color: 'var(--w80)', letterSpacing: '-0.005em', marginBottom: 6 }}>
              No athletes yet.
            </p>
            <p style={{ fontSize: 13, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
              Athletes appear here once they book a session with you.
            </p>
          </div>
        )}

        {!loading && athletes.length > 0 && filtered.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--w60)', paddingLeft: 4 }}>
            None in this bucket.
          </p>
        )}

        {/* Athlete cards */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {filtered.map(a => {
              const isActive = a.latest_booking_status === 'confirmed';
              const isPast = a.latest_booking_status === 'completed';
              const yrs = age(a.birth_date);
              const meta = [
                yrs != null ? `${yrs} yrs` : null,
                a.sport,
                a.competition_level,
                a.country,
              ].filter(Boolean) as string[];

              return (
                <Link
                  key={a.id}
                  to={`/coach/athletes/${a.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: 'var(--surface-1)',
                    border: '0.5px solid var(--surface-border-2)',
                    borderRadius: 18,
                    textDecoration: 'none', color: 'inherit',
                    transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--surface-2)',
                    border: '0.5px solid var(--surface-border-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                    letterSpacing: '-0.02em', color: 'var(--white)',
                  }}>
                    {initials(a.name ?? '?')}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 4 }}>
                      <p style={{
                        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
                        letterSpacing: '-0.02em', lineHeight: 1.1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {a.name ?? 'Unknown'}
                      </p>
                      {(isActive || isPast) && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          padding: '3px 9px', borderRadius: 50, flexShrink: 0,
                          background: isActive ? 'var(--red)' : 'transparent',
                          border: isActive ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                          color: isActive ? '#fff' : 'var(--w60)',
                          textTransform: 'uppercase',
                        }}>
                          {isActive ? 'Active' : 'Past'}
                        </span>
                      )}
                    </div>
                    {meta.length > 0 && (
                      <p style={{
                        fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: 2,
                      }}>
                        {meta.join(' · ')}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                      {a.latest_booking_at
                        ? `${isActive ? 'Next' : 'Last'} · ${lastSessionLabel(a.latest_booking_at)}`
                        : 'No sessions yet'}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: 'var(--w60)' }}>
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
