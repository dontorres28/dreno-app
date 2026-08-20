import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string;

async function fetchSignalSVG(athleteId: string, date: Date, ghost: boolean): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const dateStr = date.toISOString().slice(0, 10);
  const url = `${SERVER_URL}/api/signal/${athleteId}?date=${dateStr}${ghost ? '&ghost=1' : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Signal fetch failed');
  return res.text();
}

function dateToOffset(date: Date, origin: Date): number {
  return Math.floor((date.getTime() - origin.getTime()) / 86400000);
}

export default function Signal() {
  const { user } = useAuth();

  // Scrubber: days offset from account creation to today
  const originRef = useRef<Date>(new Date(user?.created_at ?? Date.now()));
  const today = new Date();
  const totalDays = Math.max(0, dateToOffset(today, originRef.current));

  const [offset, setOffset] = useState(totalDays); // days from origin, max=today
  const [ghost, setGhost] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const scrubDate = new Date(originRef.current.getTime() + offset * 86400000);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const svg = await fetchSignalSVG(user.id, scrubDate, ghost);
      setSvgContent(svg);
    } catch {
      setError('Could not load Signal.');
    } finally {
      setLoading(false);
    }
  }, [user, offset, ghost]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(load, 120); // debounce scrub
    return () => clearTimeout(t);
  }, [load]);

  const isToday = offset >= totalDays;
  const displayDate = isToday
    ? 'Now'
    : scrubDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1rem' }}>
            Your Signal
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 9vw, 5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
          }}>
            90 days.
          </h1>
        </div>

        {/* Signal display */}
        <div
          style={{
            width: '100%',
            aspectRatio: '400 / 560',
            background: '#0D1B2A',
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
            border: '0.5px solid rgba(235,228,210,0.07)',
          }}
        >
          {loading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 1, height: '60%', background: 'rgba(235,228,210,0.08)',
                animation: 'signal-pulse 2s ease-in-out infinite',
              }} />
            </div>
          )}
          {!loading && error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <p style={{ fontSize: 13, color: 'rgba(235,228,210,0.3)' }}>{error}</p>
            </div>
          )}
          {!error && (
            <div
              style={{ width: '100%', height: '100%', opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>

        {/* Controls */}
        <div style={{ marginTop: '2rem' }}>
          {/* Date label */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 12, color: 'var(--w40)', fontVariantNumeric: 'tabular-nums' }}>
              {displayDate}
            </span>
            <button
              onClick={() => setGhost(g => !g)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: ghost ? 'var(--white)' : 'var(--w40)',
                background: ghost ? 'var(--surface-1)' : 'transparent',
                border: `0.5px solid ${ghost ? 'var(--surface-border)' : 'transparent'}`,
                borderRadius: 50,
                padding: '5px 14px',
                cursor: 'pointer',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              Ghost
            </button>
          </div>

          {/* Scrubber */}
          {totalDays > 0 && (
            <input
              type="range"
              min={0}
              max={totalDays}
              value={offset}
              onChange={e => setOffset(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--red)', cursor: 'pointer' }}
            />
          )}

          {/* Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: 12, color: 'var(--w50)' }}>
              {originRef.current.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </span>
            <span style={{ fontSize: 12, color: 'var(--w50)' }}>Today</span>
          </div>
        </div>

        {/* Legend — no explanations, just instrument labels */}
        <div style={{
          marginTop: '3rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}>
          {[
            { label: 'Row weight', note: 'Activity that day' },
            { label: 'Row width', note: 'Session mood' },
            { label: 'Texture', note: 'Distance from your baseline' },
            { label: 'Red', note: 'Low-signal day' },
          ].map(r => (
            <div key={r.label}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w20)', marginBottom: 3 }}>
                {r.label}
              </p>
              <p style={{ fontSize: 12, color: 'var(--w40)' }}>{r.note}</p>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes signal-pulse {
          0%, 100% { opacity: 0.08; transform: scaleY(1); }
          50% { opacity: 0.22; transform: scaleY(1.08); }
        }
      `}</style>
    </Layout>
  );
}
