import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import Stepper from '../../components/Stepper';
import ThemeToggle from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CHALLENGES = [
  'Pre-competition nerves', 'Focus under pressure', 'Confidence after setbacks',
  'Team communication', 'Handling criticism', 'Perfectionism',
  'Injury recovery', 'Motivation in training', 'Identity outside sport', 'Pressure from coaches',
];

const LEVELS = ['Youth', 'Club', 'Regional', 'National', 'Professional'];

const FORMATS = [
  { label: 'Video call', sub: 'Remote sessions via the platform' },
  { label: 'Phone call', sub: 'Audio only, no camera needed' },
  { label: 'Either', sub: 'Whatever works for your schedule' },
];

const TIMEZONES = [
  'Europe/Zurich', 'Europe/London', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney',
];

const LANGUAGES = [
  'English', 'German', 'French', 'Italian', 'Spanish', 'Portuguese',
  'Dutch', 'Polish', 'Romanian', 'Russian', 'Turkish', 'Arabic',
  'Chinese', 'Japanese', 'Korean', 'Hindi', 'Swedish', 'Norwegian',
];

const COUNTRIES = [
  'Switzerland', 'Germany', 'Austria', 'France', 'Italy', 'United Kingdom',
  'United States', 'Canada', 'Australia', 'Netherlands', 'Belgium', 'Spain',
  'Portugal', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic',
  'Hungary', 'Romania', 'Russia', 'Turkey', 'Japan', 'South Korea', 'Brazil',
  'Argentina', 'South Africa', 'New Zealand', 'Ireland',
];

const TOTAL_STEPS = 4;

export default function AthleteOnboard() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [level, setLevel] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState('');
  const [timezone, setTimezone] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  function toggleChallenge(tag: string) {
    setSelected(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  }

  function toggleLanguage(lang: string) {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  }

  async function finish() {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.auth.updateUser({ data: { country, birth_date: birthDate, languages } });
      await supabase.from('profiles').update({ name }).eq('id', user.id);
      await supabase.from('athletes').update({
        sport, competition_level: level, timezone,
        session_format_pref: format.toLowerCase(), onboarded: true,
      }).eq('id', user.id);

      const rows = selected.map((tag, i) => ({ athlete_id: user.id, challenge_tag: tag, rank: i + 1 }));
      if (rows.length > 0) await supabase.from('athlete_challenges').insert(rows);

      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save');
    } finally {
      setLoading(false);
    }
  }

  const canAdvance = [
    name.trim() && sport.trim() && level && country && birthDate,
    selected.length > 0,
    format && timezone && languages.length > 0,
    true,
  ][step];

  const pill = (label: string, active: boolean, onClick: () => void, small = false) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: small ? '9px 16px' : '12px 20px',
        borderRadius: 50, fontSize: small ? 13 : 14, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        fontFamily: 'var(--font-body)',
        background: active ? 'var(--red)' : 'var(--surface-1)',
        border: active ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
        color: active ? '#fff' : 'var(--w80)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', color: 'var(--white)', WebkitFontSmoothing: 'antialiased' }}>
      {/* Top bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', flexShrink: 0 }}>
        {step > 0 && step < TOTAL_STEPS && (
          <button onClick={() => setStep(s => s - 1)} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w70)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
        )}
        {step < TOTAL_STEPS && (
          <Stepper step={step} total={TOTAL_STEPS} />
        )}
        <div style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)' }}>
          <ThemeToggle />
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 6vw 0', overflowY: 'auto' }}>

        {/* Step 0: Who you are */}
        {step === 0 && (
          <div style={{ maxWidth: 520 }}>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
              Tell us who<br />you are
            </h1>
            <p style={{ fontSize: 16, color: "var(--w70)", lineHeight: 1.6, marginBottom: "2.5rem" }}>
              This helps us match you with the right coaches.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ fontSize: 16 }} autoFocus />
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input className="input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0,10)} style={{ fontSize: 15 }} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" list="countries" value={country} onChange={e => setCountry(e.target.value)} placeholder="Switzerland" style={{ fontSize: 15 }} />
                <datalist id="countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="label">Your sport</label>
                <input className="input" value={sport} onChange={e => setSport(e.target.value)} placeholder="e.g. Ice hockey" style={{ fontSize: 16 }} />
              </div>
              <div>
                <label className="label">Competition level</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: 4 }}>
                  {LEVELS.map(l => pill(l, level === l, () => setLevel(l), true))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Challenges */}
        {step === 1 && (
          <div style={{ maxWidth: 600 }}>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
              What are you<br />working on?
            </h1>
            <p style={{ fontSize: 16, color: "var(--w70)", lineHeight: 1.6, marginBottom: "2.5rem" }}>
              Pick up to 3. Your order sets the priority.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
              {CHALLENGES.map(tag => {
                const idx = selected.indexOf(tag);
                const on = idx !== -1;
                return (
                  <button key={tag} onClick={() => toggleChallenge(tag)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 50, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, color 0.15s', background: on ? 'var(--red)' : 'var(--surface-1)', border: on ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)', color: on ? '#fff' : 'var(--w80)' }}>
                    {on && <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>{idx + 1}</span>}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: How you work + language */}
        {step === 2 && (
          <div style={{ maxWidth: 560 }}>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
              How do you<br />want to work?
            </h1>
            <p style={{ fontSize: 16, color: "var(--w70)", lineHeight: 1.6, marginBottom: "2.5rem" }}>
              You can change this anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <label className="label">Session format</label>
                {FORMATS.map(f => {
                  const on = format === f.label;
                  return (
                    <button key={f.label} onClick={() => setFormat(f.label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px 20px', borderRadius: 14, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, color 0.15s', background: on ? 'var(--red)' : 'var(--surface-1)', border: on ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: on ? '#fff' : 'var(--white)', marginBottom: 3 }}>{f.label}</p>
                      <p style={{ fontSize: 12, color: on ? 'rgba(255,255,255,0.85)' : 'var(--w60)', lineHeight: 1.4 }}>{f.sub}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="label" style={{ marginBottom: '0.75rem' }}>
                  Languages for sessions <span style={{ color: 'var(--red)', fontSize: 10 }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
                  {LANGUAGES.map(l => pill(l, languages.includes(l), () => toggleLanguage(l), true))}
                </div>
              </div>

              <div>
                <label className="label">Timezone</label>
                <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ fontSize: 15, color: timezone ? 'var(--white)' : 'var(--w40)' }}>
                  <option value="">Select your timezone</option>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div style={{ textAlign: 'center', maxWidth: 440, margin: '0 auto', paddingTop: '6vh' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,48,64,0.12)', border: '0.5px solid rgba(255,48,64,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18l7 7L28 11" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(3rem, 9vw, 5.5rem)', lineHeight: 0.92, letterSpacing: '-0.035em', marginBottom: '1.5rem' }}>You're in</h1>
            <p style={{ fontSize: 17, color: 'var(--w60)', lineHeight: 1.7, maxWidth: 320, margin: '0 auto 3rem' }}>
              Your profile is set. Find a coach and book your first session.
            </p>
            <button className="btn-primary" style={{ fontSize: 16, padding: '16px 48px' }} onClick={finish} disabled={loading}>
              {loading ? <Spinner size={18} /> : 'Go to dashboard'}
            </button>
          </div>
        )}
      </div>

      {step < 3 && (
        <div style={{ padding: '1.5rem 6vw 2.5rem', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <button className="btn-primary" style={{ fontSize: 15, height: 50, padding: '0 32px', width: '100%', maxWidth: 520, opacity: canAdvance ? 1 : 0.35 }} disabled={!canAdvance} onClick={() => setStep(s => s + 1)}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
