import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import PlanChangeRequest from '../components/PlanChangeRequest';
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
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--w60)', marginBottom: '0.875rem', paddingLeft: 4,
      }}>
        {title}
      </p>
      <div style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border-2)',
        borderRadius: 18, overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, border = true }: { label: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '15px 18px',
      borderBottom: border ? '0.5px solid var(--surface-border-2)' : 'none',
      gap: '1rem', minHeight: 52,
    }}>
      <p style={{ fontSize: 14, color: 'var(--w70)', flexShrink: 0, fontWeight: 500 }}>{label}</p>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--white)', fontSize: 15, fontFamily: 'var(--font-body)',
  textAlign: 'right', width: '100%', maxWidth: 240,
  letterSpacing: '-0.005em',
};

const selectStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--white)', fontSize: 15, fontFamily: 'var(--font-body)',
  textAlign: 'right', cursor: 'pointer',
  letterSpacing: '-0.005em',
};

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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [sportOther, setSportOther] = useState('');

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
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)',
          lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '2rem',
        }}>
          Settings
        </h1>

        {/* Profile hero — gradient card matching athlete Settings */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(255,48,64,0.08) 0%, rgba(255,48,64,0.02) 100%)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 22,
          padding: '1.5rem',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{
            position: 'absolute', top: -50, right: -50,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,48,64,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff5566 0%, #FF3040 60%, #cc1e2c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 26,
            fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
            boxShadow: '0 4px 16px rgba(255,48,64,0.35)',
            position: 'relative',
          }}>
            {(name || email || '?').trim()[0]?.toUpperCase()}
          </div>

          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--white)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name || 'Your name'}
            </p>
            <p style={{
              fontSize: 13, color: 'var(--w70)', marginTop: 4, letterSpacing: '-0.005em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {orgName || email}
            </p>
          </div>
        </div>

        {/* Plan */}
        {tier && (
          <div style={{
            position: 'relative',
            borderRadius: 22, padding: '1.5rem',
            marginBottom: '1.5rem',
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
                {planTier.charAt(0).toUpperCase() + planTier.slice(1)} plan
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1,
                  letterSpacing: '-0.04em', color: '#fff', fontWeight: 700,
                }}>
                  ${tier.price.toLocaleString()}
                </p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>/mo</p>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.005em', marginBottom: athleteLimit && stats ? 16 : 12 }}>
                {tier.desc}
              </p>

              {athleteLimit && stats && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Athlete seats</span>
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>
                      {stats.total} / {athleteLimit}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
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

        {/* Account */}
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

        {/* Organization */}
        <Section title="Organization">
          <Row label="Name">
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization name" style={inputStyle} />
          </Row>
          <Row label="Type" border={false}>
            <select value={orgType} onChange={e => setOrgType(e.target.value)} style={selectStyle}>
              <option value="">Select</option>
              {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>
        </Section>

        {/* Program — sport selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--w60)', marginBottom: '0.875rem', paddingLeft: 4,
          }}>
            Program
          </p>
          <div style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 18, padding: '1.25rem',
          }}>
            <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em', marginBottom: 4 }}>
              Sport or activity
            </p>
            <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em', marginBottom: '0.875rem' }}>
              Select all that apply.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SPORT_OPTIONS.map(s => {
                const on = sports.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    style={{
                      padding: '8px 14px', borderRadius: 50, fontSize: 13,
                      fontWeight: on ? 700 : 500,
                      fontFamily: 'var(--font-body)', cursor: 'pointer',
                      letterSpacing: '-0.005em',
                      background: on ? 'var(--red)' : 'transparent',
                      border: on ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                      color: on ? '#fff' : 'var(--w70)',
                      transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {sports.includes('Other') && (
              <input
                value={sportOther}
                onChange={e => setSportOther(e.target.value)}
                placeholder="Which sport or activity?"
                autoFocus
                style={{
                  marginTop: 12, width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                  background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)',
                  borderRadius: 12, fontSize: 15, letterSpacing: '-0.005em',
                  color: 'var(--white)', fontFamily: 'var(--font-body)', outline: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Coaches */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--w60)', marginBottom: '0.875rem', paddingLeft: 4,
          }}>
            Coaches
          </p>

          <form onSubmit={addCoach} style={{ marginBottom: coaches.length > 0 ? 10 : 0 }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
              borderRadius: 16, padding: '0.5rem 0.5rem 0.5rem 1rem',
            }}>
              <input
                type="email"
                value={coachEmail}
                onChange={e => setCoachEmail(e.target.value)}
                placeholder="coach@email.com"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 15, letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-body)', color: 'var(--white)', padding: '8px 0',
                }}
              />
              <button
                type="submit"
                disabled={addingCoach || !coachEmail.trim()}
                style={{
                  flexShrink: 0, height: 40, padding: '0 20px', borderRadius: 50,
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-body)',
                  cursor: coachEmail.trim() && !addingCoach ? 'pointer' : 'not-allowed',
                  background: coachEmail.trim() ? 'var(--red)' : 'transparent',
                  border: coachEmail.trim() ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                  color: coachEmail.trim() ? '#fff' : 'var(--w60)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
                }}
              >
                {addingCoach ? <Spinner size={14} /> : 'Invite'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em', marginTop: 6, paddingLeft: 4 }}>
              Coaches can view and support athletes in your program.
            </p>
          </form>

          {coaches.length > 0 && (
            <div style={{
              background: 'var(--surface-1)',
              border: '0.5px solid var(--surface-border-2)',
              borderRadius: 18, overflow: 'hidden',
            }}>
              {coaches.map((c, i) => {
                const isActive = c.status === 'active';
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '0.875rem 1.125rem',
                      borderTop: i > 0 ? '0.5px solid var(--surface-border-2)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--surface-2)',
                        border: '0.5px solid var(--surface-border-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                        letterSpacing: '-0.02em', color: 'var(--white)',
                      }}>
                        {(c.name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        {c.name && (
                          <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--white)' }}>
                            {c.name}
                          </p>
                        )}
                        <p style={{
                          fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {c.email}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '3px 9px', borderRadius: 50,
                        background: isActive ? 'var(--red)' : 'transparent',
                        border: isActive ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                        color: isActive ? '#fff' : 'var(--w60)',
                      }}>
                        {isActive ? 'Active' : 'Pending'}
                      </span>
                      <button
                        onClick={() => removeCoach(c.id)}
                        disabled={removingCoach === c.id}
                        style={{
                          fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', padding: '4px 2px',
                        }}
                      >
                        {removingCoach === c.id ? <Spinner size={12} /> : 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <Row label="Theme" border={false}>
            <button
              onClick={toggle}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--w80)',
                padding: 0,
              }}
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
              <span style={{
                width: 40, height: 24, borderRadius: 50,
                background: theme === 'dark' ? 'var(--red)' : 'var(--surface-2)',
                position: 'relative', display: 'inline-block', flexShrink: 0,
                transition: 'background 220ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: 3,
                  transform: `translateX(${theme === 'dark' ? 16 : 0}px)`,
                  transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'block', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }} />
              </span>
            </button>
          </Row>
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row label="Contact support">
            <a
              href="mailto:hello@dreno.app"
              style={{
                fontSize: 13, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.005em',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              Email us
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M7 3.5L9.5 6 7 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </Row>
          <Row label="Sign out" border={false}>
            <button
              onClick={handleSignOut}
              style={{
                fontSize: 13, fontWeight: 700, minHeight: 36, padding: '0 18px',
                borderRadius: 50, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
                background: 'var(--nav-active-bg)',
                color: 'var(--nav-active-color)',
                transition: 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Sign out
            </button>
          </Row>
        </Section>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
          style={{ width: '100%', height: 50, marginTop: '1rem' }}
        >
          {saving ? <Spinner size={18} /> : 'Save changes'}
        </button>
      </div>

      {planModalOpen && (
        <PlanChangeRequest
          currentTier={planTier || 'small'}
          orgName={orgName}
          contactEmail={email}
          onClose={() => setPlanModalOpen(false)}
        />
      )}
    </Layout>
  );
}
