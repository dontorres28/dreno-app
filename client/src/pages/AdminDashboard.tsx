import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const TIER_META: Record<string, { price: number; desc: string }> = {
  small:  { price: 500,  desc: 'Up to 30 athletes'  },
  medium: { price: 1200, desc: 'Up to 100 athletes' },
  large:  { price: 2500, desc: '100+ athletes'       },
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/org/overview')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = profile?.name?.split(' ')[0] ?? null;
  const org = data?.org;
  const stats = data?.stats ?? { total: 0, active: 0, pending: 0 };
  const tier = TIER_META[org?.plan_tier ?? 'small'];
  const usagePct = tier && org?.athlete_limit ? Math.round((stats.total / org.athlete_limit) * 100) : 0;

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
        <Spinner size={28} />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.25rem 6rem' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 8vw, 3.5rem)',
            lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.4rem',
          }}>
            {firstName ? `Hi, ${firstName}.` : 'Dashboard'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w40)' }}>
            {org?.org_name ?? 'Your organization'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats row */}
        <div style={{
          background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
          borderTop: '1px solid rgba(255,48,64,0.35)',
          borderRadius: 20, padding: '1.5rem 1.25rem', marginBottom: '1rem',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem',
        }}>
          {[
            { value: stats.active, label: 'Athletes', sub: 'active' },
            { value: stats.pending, label: 'Invites', sub: 'pending' },
            { value: tier?.price ? `$${tier.price.toLocaleString()}` : '—', label: 'Plan', sub: 'per month' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 6 }}>{s.value}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--w60)', letterSpacing: '-0.01em', marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: 'var(--w30)' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Plan usage */}
        {org?.athlete_limit && (
          <div style={{
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
            borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--w60)' }}>
                Plan capacity, <span style={{ fontWeight: 600 }}>{tier?.desc}</span>
              </p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{stats.total} / {org.athlete_limit}</p>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-border)', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(usagePct, 100)}%`, height: '100%', borderRadius: 2,
                background: usagePct >= 90 ? 'var(--red)' : 'rgba(52,211,153,0.7)',
                transition: 'width 1s ease',
              }} />
            </div>
            {usagePct >= 80 && (
              <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 8 }}>
                {usagePct >= 90 ? 'Almost at your limit.' : 'Approaching your plan limit.'} Contact us to upgrade.
              </p>
            )}
          </div>
        )}

        {/* Pending activation banner */}
        {!org?.onboarded && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
            padding: '1rem 1.25rem', borderRadius: 14, marginBottom: '1rem',
            background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.2)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(251,191,36,0.9)', boxShadow: '0 0 6px rgba(251,191,36,0.6)', flexShrink: 0, marginTop: 5 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Access request received</p>
              <p style={{ fontSize: 12, color: 'var(--w40)' }}>Our team will contact you within 24 hours to activate your organization.</p>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <Link to="/admin/athletes" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              borderRadius: 16, padding: '1.25rem',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,48,64,0.08)', border: '0.5px solid rgba(255,48,64,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--red)" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="10" cy="7" r="3.5"/><path d="M3 18c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Athletes</p>
              <p style={{ fontSize: 12, color: 'var(--w40)' }}>Invite and manage</p>
            </div>
          </Link>

          <Link to="/settings" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              borderRadius: 16, padding: '1.25rem', cursor: 'pointer',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,48,64,0.08)', border: '0.5px solid rgba(255,48,64,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--red)">
                  <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-1.74 1.73-1.35a.43.43 0 0 0 .1-.53l-1.64-2.84a.42.42 0 0 0-.51-.18l-2.04.82a5.95 5.95 0 0 0-1.38-.8l-.31-2.17A.42.42 0 0 0 12 4H8.74a.42.42 0 0 0-.42.36l-.31 2.17c-.5.2-.96.47-1.38.8L4.6 6.5a.42.42 0 0 0-.52.18L2.44 9.52a.42.42 0 0 0 .1.53l1.73 1.35A6 6 0 0 0 4.2 12c0 .21.02.41.07.6L2.54 13.95a.42.42 0 0 0-.1.53l1.64 2.84c.1.19.32.25.52.18l2.04-.82c.42.33.88.6 1.38.8l.31 2.17c.05.23.23.36.42.36H12c.2 0 .37-.13.41-.36l.31-2.17a5.95 5.95 0 0 0 1.38-.8l2.04.82c.2.07.41 0 .52-.18l1.64-2.84a.42.42 0 0 0-.1-.53L16.5 12.6c.04-.19.07-.4.07-.6 0-.21-.03-.41-.07-.6Z"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Settings</p>
              <p style={{ fontSize: 12, color: 'var(--w40)' }}>Account and billing</p>
            </div>
          </Link>
        </div>

        {/* Org details */}
        <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--surface-border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)' }}>
              Organization
            </p>
          </div>
          {[
            { label: 'Name', value: org?.org_name },
            { label: 'Type', value: org?.org_type },
            { label: 'Sport', value: org?.sport },
            { label: 'Plan', value: org?.plan_tier ? org.plan_tier.charAt(0).toUpperCase() + org.plan_tier.slice(1) : 'Small' },
            { label: 'Contact', value: org?.phone || '—' },
          ].map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.875rem 1.25rem',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--w40)' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value ?? '—'}</span>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}
