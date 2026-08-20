import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet, apiPost } from '../lib/api';
import toast from 'react-hot-toast';

const SPORT_OPTIONS = [
  'Ice hockey', 'Soccer', 'Basketball', 'Tennis', 'Swimming',
  'Athletics', 'Rugby', 'Cycling', 'Combat sports', 'Triathlon',
  'Gymnastics', 'Rowing', 'Volleyball', 'Baseball', 'Golf', 'Other',
];

const ORG_TYPES = [
  'Sports club', 'School', 'University',
  'Professional team', 'Corporate wellness', 'Sports academy', 'Other',
];

const TIER_META: Record<string, { price: number; desc: string }> = {
  small:  { price: 500,  desc: 'Up to 30 athletes'  },
  medium: { price: 1200, desc: 'Up to 100 athletes' },
  large:  { price: 2500, desc: '100+ athletes'       },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.875rem' }}>
        {title}
      </p>
      <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, sub, children, border = true }: { label: string; sub?: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', gap: '1rem',
      borderBottom: border ? '0.5px solid var(--surface-border)' : 'none',
    }}>
      <div>
        <p style={{ fontSize: 14, color: 'var(--w70)' }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 2 }}>{sub}</p>}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)',
  textAlign: 'right', width: '100%', maxWidth: 220,
};

const chevron = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6h7M7 3.5L9.5 6 7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AdminSettings() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coachEmail, setCoachEmail] = useState('');
  const [addingCoach, setAddingCoach] = useState(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [removingCoach, setRemovingCoach] = useState<string | null>(null);

  // Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Org
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [sportOther, setSportOther] = useState('');

  // Loaded from administrators table
  const [planTier, setPlanTier] = useState('');
  const [athleteLimit, setAthleteLimit] = useState<number | null>(null);
  const [stats, setStats] = useState<{ active: number; pending: number; total: number } | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    setEmail(user.email ?? '');
    setName(profile.name ?? '');

    Promise.all([
      supabase.from('administrators').select('*').eq('id', user.id).single(),
      apiGet('/api/org/overview').catch(() => null),
    ]).then(([{ data }, overview]) => {
      if (data) {
        setPhone(data.phone ?? '');
        setOrgName(data.org_name ?? '');
        setOrgType(data.org_type ?? '');
        const saved = data.sport ?? '';
      const savedList = saved ? saved.split(', ') : [];
      const knownSports = new Set(SPORT_OPTIONS.filter(s => s !== 'Other'));
      const known = savedList.filter((s: string) => knownSports.has(s));
      const unknown = savedList.filter((s: string) => !knownSports.has(s));
      setSports(unknown.length > 0 ? [...known, 'Other'] : known);
      setSportOther(unknown.join(', '));
        setPlanTier(data.plan_tier ?? '');
        setAthleteLimit(data.athlete_limit ?? null);
      }
      if (overview) {
        setStats(overview.stats ?? null);
        setCoaches(overview.coaches ?? []);
      }
      setLoading(false);
    });
  }, [user, profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await Promise.all([
        supabase.from('profiles').update({ name, phone: phone || null }).eq('id', user.id),
        supabase.from('administrators').update({
          org_name: orgName,
          org_type: orgType,
          sport: [
            ...sports.filter(s => s !== 'Other'),
            ...(sports.includes('Other') && sportOther.trim() ? [sportOther.trim()] : []),
          ].join(', ') || null,
        }).eq('id', user.id),
        email !== (user.email ?? '') ? supabase.auth.updateUser({ email }).then(({ error }) => {
          if (error) throw error;
          toast('Check your new email to confirm the change.', { icon: '✉️' });
        }) : Promise.resolve(),
      ]);
      toast.success('Saved.');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function addCoach(e: React.FormEvent) {
    e.preventDefault();
    if (!coachEmail.trim()) return;
    setAddingCoach(true);
    try {
      await apiPost('/api/org/invite-coach', { email: coachEmail.trim() });
      toast.success(`Coach invite sent to ${coachEmail}`);
      setCoachEmail('');
      const overview = await apiGet('/api/org/overview');
      setCoaches(overview.coaches ?? []);
    } catch (err: any) {
      toast.error(err.message ?? 'Could not invite coach');
    } finally {
      setAddingCoach(false);
    }
  }

  async function removeCoach(coachId: string) {
    setRemovingCoach(coachId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/org/coaches/${coachId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      toast.success('Coach removed');
      setCoaches(c => c.filter(x => x.id !== coachId));
    } catch {
      toast.error('Could not remove coach');
    } finally {
      setRemovingCoach(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const tier = TIER_META[planTier];
  const usagePct = athleteLimit && stats ? Math.round((stats.total / athleteLimit) * 100) : 0;

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}>
        <Spinner size={32} />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem 6rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2.5rem' }}>
          Settings
        </h1>

        {/* ── Plan overview ── */}
        {tier && (
          <div style={{
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
            borderTop: '1px solid rgba(255,48,64,0.35)',
            borderRadius: 20, padding: '1.25rem 1.5rem', marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: 6 }}>Current plan</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
                </p>
                <p style={{ fontSize: 13, color: 'var(--w40)', marginTop: 4 }}>{tier.desc}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1 }}>${tier.price.toLocaleString()}</p>
                <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 4 }}>/month</p>
              </div>
            </div>

            {athleteLimit && stats && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--w50)' }}>Athlete seats</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{stats.active} / {athleteLimit}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-border)' }}>
                  <div style={{
                    width: `${Math.min(usagePct, 100)}%`, height: '100%', borderRadius: 2,
                    background: usagePct >= 90 ? 'var(--red)' : 'rgba(52,211,153,0.7)',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </>
            )}

            <button
              onClick={() => toast('Contact us at hello@dreno.app to change your plan.', { icon: '✉️' })}
              style={{
                marginTop: '1rem', fontSize: 13, fontWeight: 600, color: 'var(--red)',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              Upgrade or change plan {chevron}
            </button>
          </div>
        )}

        {/* ── Account ── */}
        <Section title="Account">
          <Row label="Name">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
          </Row>
          <Row label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" style={inputStyle} />
          </Row>
          <Row label="Phone" border={false}>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Optional" style={inputStyle} />
          </Row>
        </Section>

        {/* ── Organization ── */}
        <Section title="Organization">
          <Row label="Name">
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization name" style={inputStyle} />
          </Row>
          <Row label="Type" border={false}>
            <select
              value={orgType}
              onChange={e => setOrgType(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
            >
              <option value="">Select</option>
              {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>
        </Section>

        {/* ── Program ── */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.875rem' }}>
            Program
          </p>
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: 13, color: 'var(--w50)', marginBottom: 4 }}>Sport or activity</p>
            <p style={{ fontSize: 12, color: 'var(--w30)', marginBottom: '0.875rem' }}>Select all that apply.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPORT_OPTIONS.map(s => (
                <button key={s} type="button"
                  onClick={() => setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  style={{
                    padding: '8px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s',
                    background: sports.includes(s) ? 'rgba(255,48,64,0.10)' : 'transparent',
                    border: sports.includes(s) ? '0.5px solid rgba(255,48,64,0.45)' : '0.5px solid var(--surface-border)',
                    color: sports.includes(s) ? 'var(--white)' : 'var(--w50)',
                  }}>{s}</button>
              ))}
            </div>
            {sports.includes('Other') && (
              <input
                value={sportOther}
                onChange={e => setSportOther(e.target.value)}
                placeholder="Which sport or activity?"
                autoFocus
                style={{
                  marginTop: 12, width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
                  borderRadius: 10, fontSize: 14, fontFamily: 'var(--font-body)',
                  color: 'var(--white)', outline: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* ── Coaches ── */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.875rem' }}>
            Coaches
          </p>

          {/* Invite form */}
          <form onSubmit={addCoach} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex', gap: 8,
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              borderRadius: 14, padding: '0.625rem',
            }}>
              <input
                type="email"
                value={coachEmail}
                onChange={e => setCoachEmail(e.target.value)}
                placeholder="coach@email.com"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--white)', padding: '6px 8px' }}
              />
              <button type="submit" className="btn-primary" disabled={addingCoach || !coachEmail.trim()} style={{ fontSize: 13, padding: '9px 18px', flexShrink: 0 }}>
                {addingCoach ? <Spinner size={13} /> : 'Add coach'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--w30)', marginTop: 6, paddingLeft: 4 }}>
              Coaches can view and support athletes in your program.
            </p>
          </form>

          {coaches.length > 0 && (
            <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, overflow: 'hidden' }}>
              {coaches.map((c, i) => (
                <div key={c.id} style={{
                  padding: '0.875rem 1.125rem',
                  borderTop: i > 0 ? '0.5px solid var(--surface-border)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,48,64,0.08)', border: '0.5px solid rgba(255,48,64,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--red)',
                    }}>
                      {(c.name || c.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {c.name && <p style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</p>}
                      <p style={{ fontSize: 12, color: 'var(--w40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 50,
                      background: c.status === 'active' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.10)',
                      color: c.status === 'active' ? 'rgba(52,211,153,0.9)' : 'rgba(251,191,36,0.8)',
                    }}>{c.status ?? 'pending'}</span>
                    <button
                      onClick={() => removeCoach(c.id)}
                      disabled={removingCoach === c.id}
                      style={{ fontSize: 12, color: 'var(--w30)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 4 }}
                    >
                      {removingCoach === c.id ? <Spinner size={12} /> : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Notifications (future hook points) ── */}
        <Section title="Notifications">
          <Row label="New athlete joins" sub="When someone accepts your invite">
            <div style={{
              width: 40, height: 22, borderRadius: 11, background: 'var(--red)',
              position: 'relative', cursor: 'not-allowed', opacity: 0.6,
            }}>
              <div style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--white)' }} />
            </div>
          </Row>
          <Row label="Weekly summary" sub="Athlete activity digest every Monday" border={false}>
            <div style={{
              width: 40, height: 22, borderRadius: 11, background: 'var(--red)',
              position: 'relative', cursor: 'not-allowed', opacity: 0.6,
            }}>
              <div style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--white)' }} />
            </div>
          </Row>
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <Row label="Theme" border={false}>
            <button
              onClick={toggle}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--w60)' }}
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
              <span style={{ width: 40, height: 23, borderRadius: 12, background: 'var(--surface-border)', position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                <span style={{ width: 17, height: 17, borderRadius: '50%', background: 'var(--white)', position: 'absolute', top: 3, left: 3, transform: `translateX(${theme === 'dark' ? 17 : 0}px)`, transition: 'transform 0.2s ease', display: 'block' }} />
              </span>
            </button>
          </Row>
        </Section>

        {/* ── Danger ── */}
        <Section title="Account">
          <Row label="Contact support" sub="Billing, upgrades, cancellations">
            <a
              href="mailto:hello@dreno.app"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Email us {chevron}
            </a>
          </Row>
          <Row label="Sign out" border={false}>
            <button onClick={handleSignOut} className="btn-danger" style={{ fontSize: 13, padding: '7px 16px' }}>
              Sign out
            </button>
          </Row>
        </Section>

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
          style={{ width: '100%', padding: '15px', fontSize: 15, marginTop: '0.5rem' }}
        >
          {saving ? <Spinner size={18} /> : 'Save changes'}
        </button>
      </div>
    </Layout>
  );
}
