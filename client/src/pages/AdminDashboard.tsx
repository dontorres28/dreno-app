import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import PlanChangeRequest from '../components/PlanChangeRequest';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const TIER_META: Record<string, { price: number; desc: string }> = {
  small:  { price: 500,  desc: 'Up to 30 athletes'  },
  medium: { price: 1200, desc: 'Up to 100 athletes' },
  large:  { price: 2500, desc: '100+ athletes'       },
};

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);

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

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
        <Spinner size={28} />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="label" style={{ margin: 0, marginBottom: 10 }}>
            {dateStr}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 6,
          }}>
            {firstName ? `Hi, ${firstName}.` : 'Dashboard'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
            {org?.org_name ?? 'Your organization'}
          </p>
        </div>

        {/* Plan hero — red gradient */}
        {tier && (
          <div style={{
            position: 'relative',
            borderRadius: 24,
            padding: '1.75rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, var(--red) 0%, #d92535 100%)',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -50, right: -40, width: 220, height: 220,
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}/>
            <div style={{ position: 'relative' }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.75)', marginBottom: 10,
              }}>
                {org?.plan_tier ? `${org.plan_tier.charAt(0).toUpperCase() + org.plan_tier.slice(1)} plan` : 'Plan'}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 1,
                  letterSpacing: '-0.04em', color: '#fff', fontWeight: 700,
                }}>
                  ${tier.price.toLocaleString()}
                </p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.005em' }}>/mo</p>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.005em', marginBottom: 16 }}>
                {tier.desc}
              </p>

              {org?.athlete_limit && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.005em' }}>
                      Athlete seats
                    </span>
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, letterSpacing: '-0.005em' }}>
                      {stats.total} / {org.athlete_limit}
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 4, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.2)',
                  }}>
                    <div style={{
                      width: `${Math.min(usagePct, 100)}%`, height: '100%', borderRadius: 4,
                      background: '#fff',
                      transition: 'width 800ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }} />
                  </div>
                </div>
              )}

              <button
                onClick={() => setPlanModalOpen(true)}
                style={{
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em',
                  color: 'var(--red)', background: '#fff',
                  border: 'none', borderRadius: 50, padding: '9px 18px',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                Upgrade or change
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6h7M7 3.5L9.5 6 7 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Pending activation banner */}
        {!org?.onboarded && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
            padding: '1rem 1.25rem', borderRadius: 16, marginBottom: '1.25rem',
            background: 'rgba(255,48,64,0.07)',
            border: '0.5px solid rgba(255,48,64,0.22)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--red)',
              boxShadow: '0 0 8px rgba(255,48,64,0.6)',
              flexShrink: 0, marginTop: 6,
            }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em', marginBottom: 3 }}>
                Access request received
              </p>
              <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em', lineHeight: 1.5 }}>
                Our team will contact you within 24 hours to activate your organization.
              </p>
            </div>
          </div>
        )}

        {/* Athletes — rich hero-style card */}
        <Link to="/admin/athletes" style={{ textDecoration: 'none', display: 'block', marginBottom: '1.25rem' }}>
          <div style={{
            position: 'relative',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 22, padding: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            cursor: 'pointer',
            transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'rgba(255,48,64,0.1)',
              border: '0.5px solid rgba(255,48,64,0.22)',
              color: 'var(--red)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="label" style={{ margin: 0, marginBottom: 8 }}>Athletes</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
                  letterSpacing: '-0.035em', lineHeight: 1,
                }}>
                  {stats.active}
                </p>
                <p style={{ fontSize: 13, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                  active{stats.pending > 0 ? ` · ${stats.pending} pending` : ''}
                </p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
                Invite and manage your roster
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--w60)', flexShrink: 0 }}>
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Link>

        {/* Org details */}
        <div style={{
          background: 'var(--surface-1)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 20, padding: '1.5rem',
        }}>
          <p className="label" style={{ margin: 0, marginBottom: '1.25rem' }}>Organization</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: 'Name', value: org?.org_name },
              { label: 'Type', value: org?.org_type },
              { label: 'Sport', value: org?.sport },
              { label: 'Plan', value: org?.plan_tier ? org.plan_tier.charAt(0).toUpperCase() + org.plan_tier.slice(1) : 'Small' },
              { label: 'Contact', value: org?.phone || '—' },
            ].map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.875rem 0',
                  borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border-2)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--w60)', letterSpacing: '-0.005em' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--w80)' }}>
                  {row.value ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {planModalOpen && (
        <PlanChangeRequest
          currentTier={org?.plan_tier || 'small'}
          orgName={org?.org_name}
          contactEmail={user?.email ?? undefined}
          onClose={() => setPlanModalOpen(false)}
        />
      )}
    </Layout>
  );
}
