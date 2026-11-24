import { useEffect, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { getFlags, recomputeStats } from '../lib/admin';

interface FlaggedCoach {
  coach_id: string;
  name: string;
  count: number;
  notes: { note: string; at: string }[];
}

export default function AdminFlags() {
  const [flags, setFlags] = useState<FlaggedCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getFlags()
      .then(d => setFlags(d as unknown as FlaggedCoach[]))
      .catch((e: any) => setError(e.message ?? 'Could not load flags'))
      .finally(() => setLoading(false));
  }, []);

  async function recompute() {
    setRecomputing(true);
    try {
      const res = await recomputeStats();
      alert(`Done. ${res.coaches} coaches updated, ${res.aggregates} aggregates updated.`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRecomputing(false);
    }
  }

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}><Spinner size={28} /></div></Layout>;
  }

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--w60)', marginBottom: 8 }}>
              Admin
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em' }}>
              Flags queue
            </h1>
          </div>
          <button
            className="btn-ghost"
            style={{ fontSize: 13, padding: '10px 20px' }}
            disabled={recomputing}
            onClick={recompute}
          >
            {recomputing ? <Spinner size={14} /> : 'Recompute stats'}
          </button>
        </div>

        {flags.length === 0 ? (
          <div style={{
            padding: '3rem', textAlign: 'center',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 16,
          }}>
            <p style={{ fontSize: 15, color: 'var(--w60)' }}>No flags in the last 90 days.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {flags.map(f => (
              <div
                key={f.coach_id}
                style={{
                  background: 'var(--surface-1)', border: `0.5px solid ${f.count >= 3 ? 'rgba(77,166,255,0.35)' : 'var(--surface-border-2)'}`,
                  borderRadius: 16, overflow: 'hidden',
                }}
              >
                <div
                  style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === f.coach_id ? null : f.coach_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: f.count >= 3 ? 'rgba(77,166,255,0.12)' : 'var(--surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {(f.name ?? '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600 }}>{f.name ?? f.coach_id}</p>
                      <p style={{ fontSize: 12, color: 'var(--w60)', marginTop: 2 }}>
                        {f.count} flag{f.count !== 1 ? 's' : ''} in 90 days
                        {f.count >= 3 && <span style={{ color: 'var(--red)', marginLeft: 8, fontWeight: 700 }}>Review required</span>}
                      </p>
                    </div>
                  </div>
                  <CaretDown size={14} weight="bold" />
                </div>

                {expanded === f.coach_id && (
                  <div style={{ borderTop: '0.5px solid var(--surface-border-2)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {f.notes.map((n, i) => (
                      <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--surface-2)', borderRadius: 10 }}>
                        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 4 }}>{n.note}</p>
                        <p style={{ fontSize: 11, color: 'var(--w60)' }}>
                          {new Date(n.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
