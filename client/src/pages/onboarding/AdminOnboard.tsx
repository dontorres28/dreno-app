import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../../components/Spinner';

const SPORT_OPTIONS = [
  'Ice hockey', 'Soccer', 'Basketball', 'Tennis', 'Swimming',
  'Athletics', 'Rugby', 'Cycling', 'Combat sports', 'Triathlon',
  'Gymnastics', 'Rowing', 'Volleyball', 'Baseball', 'Golf',
  'Other',
];

const TIERS = [
  { limit: 30,   price: 500,  label: 'Small',  key: 'small',  desc: 'Up to 30 athletes' },
  { limit: 100,  price: 1200, label: 'Medium', key: 'medium', desc: 'Up to 100 athletes' },
  { limit: null, price: 2500, label: 'Large',  key: 'large',  desc: '100+ athletes' },
];
const ANNUAL_DISCOUNT = 0.15;

const ORG_TYPES = [
  'Sports club', 'School', 'University',
  'Professional team', 'Corporate wellness', 'Sports academy', 'Other',
];

export default function AdminOnboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');

  const [sports, setSports] = useState<string[]>([]);
  const [sportOther, setSportOther] = useState('');
  const [tierIdx, setTierIdx] = useState(0);
  const [annual, setAnnual] = useState(false);

  const [phone, setPhone] = useState('');
  const [referral, setReferral] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  function toggleSport(s: string) {
    setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  const resolvedSports = sports.includes('Other')
    ? [...sports.filter(s => s !== 'Other'), sportOther.trim()].filter(Boolean)
    : sports;
  const resolvedSport = resolvedSports.join(', ');
  const tier = TIERS[tierIdx];
  const monthlyPrice = annual
    ? Math.round(tier.price * (1 - ANNUAL_DISCOUNT))
    : tier.price;
  const annualTotal = Math.round(tier.price * (1 - ANNUAL_DISCOUNT) * 12);

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ name }).eq('id', user.id);
      const { error } = await supabase.from('administrators').upsert({
        id: user.id,
        org_name: orgName,
        org_type: orgType,
        sport: resolvedSport || null,
        athlete_limit: tier.limit ?? 999,
        plan_tier: tier.key,
        phone: phone || null,
        referral: referral || null,
        onboarded: true,
      });
      if (error) throw error;
      navigate('/admin-dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto',
  };
  const innerStyle: React.CSSProperties = {
    maxWidth: 480, width: '100%',
    margin: '0 auto',
    padding: '3.5rem 1.5rem 5rem',
    flex: 1,
  };

  const progressBar = (
    <div style={{ display: 'flex', gap: 6, marginBottom: '3rem' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          height: 2, flex: 1, borderRadius: 2,
          background: i <= step ? 'var(--red)' : 'var(--surface-border)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );

  const eyelet = (t: string) => (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1rem' }}>{t}</p>
  );

  const fieldLabel = (t: string) => (
    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--w60)', marginBottom: 6 }}>{t}</p>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px',
    background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
    borderRadius: 12, fontSize: 15, fontFamily: 'var(--font-body)',
    color: 'var(--white)', outline: 'none', boxSizing: 'border-box',
  };

  const backBtn = (toStep: number) => (
    <button onClick={() => setStep(toStep)} style={{
      padding: '15px 24px', borderRadius: 50, background: 'none',
      border: '0.5px solid var(--surface-border)', fontSize: 15,
      color: 'var(--w50)', cursor: 'pointer', fontFamily: 'var(--font-body)',
    }}>Back</button>
  );

  // ── Step 0: Who you are ──────────────────────────────────────────
  if (step === 0) return (
    <div style={containerStyle} ref={scrollRef}>
      <div style={innerStyle}>
        {progressBar}
        {eyelet('Getting started')}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2.5rem' }}>
          Tell us about<br />your organization.
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            {fieldLabel('Your name')}
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            {fieldLabel('Organization name')}
            <input style={inputStyle} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Zurich Hockey Academy" />
          </div>
          <div>
            {fieldLabel('Organization type')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {ORG_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setOrgType(t)} style={{
                  padding: '9px 16px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                  fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s',
                  background: orgType === t ? 'rgba(255,48,64,0.10)' : 'var(--surface-1)',
                  border: orgType === t ? '0.5px solid rgba(255,48,64,0.45)' : '0.5px solid var(--surface-border)',
                  color: orgType === t ? 'var(--white)' : 'var(--w50)',
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <button className="btn-primary" style={{ width: '100%', fontSize: 16, padding: '15px', marginTop: '2.5rem' }}
          disabled={!name.trim() || !orgName.trim() || !orgType}
          onClick={() => setStep(1)}>
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step 1: Program + pricing ────────────────────────────────────
  if (step === 1) return (
    <div style={containerStyle} ref={scrollRef}>
      <div style={innerStyle}>
        {progressBar}
        {eyelet('Your program')}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2.5rem' }}>
          Choose your plan.
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            {fieldLabel('Sport or activity')}
            <p style={{ fontSize: 12, color: 'var(--w40)', marginBottom: 10 }}>Select all that apply.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPORT_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => toggleSport(s)} style={{
                  padding: '9px 16px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                  fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s',
                  background: sports.includes(s) ? 'rgba(255,48,64,0.10)' : 'var(--surface-1)',
                  border: sports.includes(s) ? '0.5px solid rgba(255,48,64,0.45)' : '0.5px solid var(--surface-border)',
                  color: sports.includes(s) ? 'var(--white)' : 'var(--w50)',
                }}>{s}</button>
              ))}
            </div>
            {sports.includes('Other') && (
              <input
                style={{ ...inputStyle, marginTop: 10 }}
                value={sportOther}
                onChange={e => setSportOther(e.target.value)}
                placeholder="Which sport or activity?"
                autoFocus
              />
            )}
          </div>

          {/* Billing toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: !annual ? 'var(--white)' : 'var(--w40)', fontWeight: !annual ? 600 : 400, transition: 'color 0.2s' }}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setAnnual(a => !a)}
              style={{
                width: 44, height: 24, borderRadius: 50, cursor: 'pointer', border: 'none',
                background: annual ? 'var(--red)' : 'var(--surface-border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: annual ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'var(--white)',
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: annual ? 'var(--white)' : 'var(--w40)', fontWeight: annual ? 600 : 400, transition: 'color 0.2s' }}>
                Annual
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50,
                background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.9)',
                letterSpacing: '0.04em',
              }}>
                -15%
              </span>
            </span>
          </div>

          {/* Tier cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIERS.map((t, i) => {
              const mPrice = annual ? Math.round(t.price * (1 - ANNUAL_DISCOUNT)) : t.price;
              const ppa = t.limit ? (mPrice / t.limit).toFixed(2) : null;
              const active = tierIdx === i;
              return (
                <div key={t.key} onClick={() => setTierIdx(i)} style={{
                  padding: '1.25rem 1.5rem', borderRadius: 18, cursor: 'pointer',
                  background: active ? 'rgba(255,48,64,0.07)' : 'var(--surface-1)',
                  border: active ? '0.5px solid rgba(255,48,64,0.45)' : '0.5px solid var(--surface-border)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Radio */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: active ? '5px solid var(--red)' : '1.5px solid var(--surface-border)',
                      transition: 'all 0.15s',
                    }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: active ? 'var(--white)' : 'var(--w70)' }}>{t.label}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--w30)' }}>
                          {t.desc}
                        </span>
                      </div>
                      {ppa && (
                        <p style={{ fontSize: 12, color: 'var(--w40)' }}>
                          ${ppa}/athlete/mo
                        </p>
                      )}
                      {!ppa && (
                        <p style={{ fontSize: 12, color: 'var(--w40)' }}>Custom pricing above 100</p>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, letterSpacing: '-0.03em', color: active ? 'var(--white)' : 'var(--w60)' }}>
                      ${mPrice.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--w40)', marginTop: 2 }}>/mo</p>
                  </div>
                </div>
              );
            })}
          </div>

          {annual && (
            <div style={{
              padding: '0.875rem 1.25rem', borderRadius: 12,
              background: 'rgba(52,211,153,0.07)', border: '0.5px solid rgba(52,211,153,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <p style={{ fontSize: 13, color: 'rgba(52,211,153,0.9)', fontWeight: 500 }}>
                Annual total (billed once)
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '-0.03em', color: 'rgba(52,211,153,0.9)' }}>
                ${annualTotal.toLocaleString()}
              </p>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--w30)', textAlign: 'center' }}>
            Annual contracts available at 15% discount. All plans include unlimited coach access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: '2rem' }}>
          {backBtn(0)}
          <button className="btn-primary" style={{ flex: 1, fontSize: 16, padding: '15px' }} onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Contact + summary ────────────────────────────────────
  return (
    <div style={containerStyle} ref={scrollRef}>
      <div style={innerStyle}>
        {progressBar}
        {eyelet('Almost done')}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          One last thing.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--w40)', marginBottom: '2.5rem' }}>
          Our team will reach out to confirm your plan and get you set up.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            {fieldLabel('Phone number (optional)')}
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+41 79 000 00 00" type="tel" />
          </div>
          <div>
            {fieldLabel('How did you hear about Dreno?')}
            <input style={inputStyle} value={referral} onChange={e => setReferral(e.target.value)} placeholder="Coach referral, social media, conference..." />
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1rem' }}>
              Plan summary
            </p>
            {[
              { label: 'Organization', value: orgName },
              { label: 'Type', value: orgType },
              { label: 'Sport', value: resolvedSport || '—' },
              { label: 'Plan', value: `${tier.label}, ${tier.desc}` },
              { label: 'Billing', value: annual ? 'Annual' : 'Monthly' },
              { label: 'Monthly', value: `$${monthlyPrice.toLocaleString()}` },
              ...(annual ? [{ label: 'Annual total', value: `$${annualTotal.toLocaleString()}` }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--surface-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--w40)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: '2rem' }}>
          {backBtn(1)}
          <button className="btn-primary" style={{ flex: 1, fontSize: 16, padding: '15px' }} disabled={saving} onClick={finish}>
            {saving ? <Spinner size={18} /> : 'Request access'}
          </button>
        </div>
      </div>
    </div>
  );
}
