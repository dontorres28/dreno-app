import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SPORT_OPTIONS = [
  'Ice hockey', 'Soccer', 'Basketball', 'Tennis', 'Swimming',
  'Athletics', 'Rugby', 'Cycling', 'Combat sports', 'Triathlon',
  'Gymnastics', 'Rowing', 'Volleyball', 'Baseball', 'Golf',
];

const TAG_OPTIONS = [
  'Focus', 'Composure', 'Confidence', 'Pre-performance',
  'Pressure management', 'Team dynamics', 'Goal setting',
  'Identity', 'Injury recovery', 'Motivation',
];

const CRED_TYPES = [
  'MSc Sport Psychology', 'BSc Sport Science', 'PhD', 'Coaching certificate',
  'BASES accredited', 'HCPC registered', 'Swiss Olympic certified',
  'Elite athlete background', 'CBT trained', 'Other',
];

const APPROACHES = [
  { key: 'performance', label: 'Performance focus', desc: 'Getting into the zone and staying there.' },
  { key: 'resilience', label: 'Pressure and resilience', desc: 'Setbacks, fear, and the hard moments.' },
  { key: 'cognitive', label: 'Structured techniques', desc: 'Visualization, self-talk, CBT frameworks.' },
  { key: 'holistic', label: 'The whole person', desc: 'Identity, life outside sport, long-game thinking.' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

interface Slot { day: string; start: string; end: string; }
interface CertFile { name: string; url: string; }

const TOTAL_STEPS = 6;

async function uploadFile(file: File, userId: string, path: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const fullPath = `${userId}/${path}.${ext}`;
  const { error } = await supabase.storage.from('coach-files').upload(fullPath, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('coach-files').getPublicUrl(fullPath).data.publicUrl;
}

export default function CoachOnboard() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // Step 0
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [approach, setApproach] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 1
  const [credTypes, setCredTypes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [certFiles, setCertFiles] = useState<CertFile[]>([]);
  const [pendingCerts, setPendingCerts] = useState<File[]>([]);
  const [linkedin, setLinkedin] = useState('');
  const certInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [sports, setSports] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Step 3 — Framework
  const [frameworkText, setFrameworkText] = useState('');
  const [frameworkBullets, setFrameworkBullets] = useState<string[] | null>(null);
  const [frameworkGenerating, setFrameworkGenerating] = useState(false);
  const [frameworkApproved, setFrameworkApproved] = useState(false);
  const [frameworkError, setFrameworkError] = useState('');
  const [frameworkGenerateCount, setFrameworkGenerateCount] = useState(0);

  // Step 4
  const [rate, setRate] = useState('');
  const [minSession, setMinSession] = useState(30);
  const [maxSession, setMaxSession] = useState(120);
  const [slots, setSlots] = useState<Slot[]>([{ day: 'Monday', start: '09:00', end: '17:00' }]);

  const toggleSport = (s: string) => setSports(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleTag = (t: string) => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleCred = (c: string) => setCredTypes(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleLang = (l: string) => setLanguages(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  const addSlot = () => setSlots(p => {
    const usedDays = p.map(s => s.day);
    const nextDay = DAYS.find(d => !usedDays.includes(d)) ?? 'Monday';
    return [...p, { day: nextDay, start: '09:00', end: '17:00' }];
  });
  const updateSlot = (i: number, f: keyof Slot, v: string) => setSlots(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const removeSlot = (i: number) => setSlots(p => p.filter((_, idx) => idx !== i));

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onCertAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingCerts(p => [...p, ...files]);
    e.target.value = '';
  }

  function removePending(i: number) {
    setPendingCerts(p => p.filter((_, idx) => idx !== i));
  }

  async function generateFramework() {
    if (!user || !frameworkText.trim()) return;
    setFrameworkGenerating(true);
    setFrameworkError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/coach/framework/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ coach_id: user.id, raw_text: frameworkText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      setFrameworkBullets(json.bullets);
      setFrameworkGenerateCount(c => c + 1);
      setFrameworkApproved(false);
    } catch (err: any) {
      setFrameworkError(err.message ?? 'Something went wrong');
    } finally {
      setFrameworkGenerating(false);
    }
  }

  async function approveFramework() {
    if (!user || !frameworkBullets) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/coach/framework/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ coach_id: user.id, input_type: 'text', raw_text: frameworkText, bullets: frameworkBullets }),
      });
      setFrameworkApproved(true);
    } catch { /* non-fatal */ }
  }

  async function save() {
    if (!user) return;
    setLoading(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        try { photoUrl = await uploadFile(photoFile, user.id, 'avatar'); }
        catch { toast.error('Photo upload failed. Add it later from your profile.'); }
      }

      const uploadedCerts: CertFile[] = [];
      for (let i = 0; i < pendingCerts.length; i++) {
        try {
          const url = await uploadFile(pendingCerts[i], user.id, `cert-${Date.now()}-${i}`);
          uploadedCerts.push({ name: pendingCerts[i].name, url });
        } catch { /* skip failed cert */ }
      }

      const credentials = JSON.stringify({ types: credTypes, files: uploadedCerts });

      await supabase.auth.updateUser({ data: { birth_date: birthDate, country, languages } });
      await supabase.from('profiles').update({ name }).eq('id', user.id);
      await supabase.from('coaches').update({
        headline,
        bio: approach ? APPROACHES.find(a => a.key === approach)?.desc ?? '' : '',
        credentials,
        linkedin_url: linkedin || null,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
        sports,
        expertise_tags: tags,
        hourly_rate: parseInt(rate, 10) || null,
        min_session_min: minSession,
        max_session_min: maxSession,
        onboarded: true,
      }).eq('id', user.id);

      await supabase.from('availability').delete().eq('coach_id', user.id);
      if (slots.length > 0) {
        await supabase.from('availability').insert(
          slots.map(s => ({ coach_id: user.id, day_of_week: s.day.toLowerCase(), start_time: s.start, end_time: s.end }))
        );
      }

      await refreshProfile();
      setStep(TOTAL_STEPS - 1);
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save');
    } finally {
      setLoading(false);
    }
  }

  const canAdvance = [
    name.trim() && headline.trim() && approach && birthDate && country,
    pendingCerts.length > 0 && languages.length > 0,
    sports.length > 0,
    true,
    rate.trim(),
    true,
  ][step];

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '11px 18px', borderRadius: 50, fontSize: 14, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
        background: active ? 'rgba(255,48,64,0.12)' : 'var(--surface-1)',
        border: active ? '0.5px solid rgba(255,48,64,0.4)' : '0.5px solid var(--surface-border)',
        color: active ? 'var(--white)' : 'var(--w60)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-body)', color: 'var(--white)', WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', flexShrink: 0 }}>
        {step > 0 && step < TOTAL_STEPS - 1 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w60)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        ) : <span />}

        {step < TOTAL_STEPS - 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? 'var(--red)' : 'var(--surface-border)', transition: 'width 0.3s ease, background 0.3s ease' }} />
            ))}
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem 6vw 0', overflowY: 'auto' }}>

        {/* ── Step 0: Profile ── */}
        {step === 0 && (
          <div style={{ maxWidth: 580 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1.25rem' }}>Step 1 of 5</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Your coach<br />profile.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w60)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              This is the first thing athletes see.
            </p>

            {/* Photo upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                  background: photoPreview ? 'transparent' : 'var(--surface-1)',
                  border: photoPreview ? 'none' : '0.5px dashed var(--w20)',
                  cursor: 'pointer', overflow: 'hidden', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="var(--w40)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                }
              </button>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Profile photo</p>
                <p style={{ fontSize: 12, color: 'var(--w40)' }}>Tap to upload. JPG or PNG.</p>
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ fontSize: 16 }} autoFocus />
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input className="input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0,10)} style={{ fontSize: 15 }} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" list="coach-countries" value={country} onChange={e => setCountry(e.target.value)} placeholder="Switzerland" style={{ fontSize: 15 }} />
                <datalist id="coach-countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="label">Headline</label>
                <input className="input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Focus and composure for contact sports" style={{ fontSize: 16 }} />
              </div>
            </div>

            <div>
              <label className="label" style={{ marginBottom: '0.875rem' }}>How you work</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {APPROACHES.map(a => (
                  <button
                    key={a.key}
                    onClick={() => setApproach(a.key)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                      background: approach === a.key ? 'rgba(255,48,64,0.08)' : 'var(--surface-1)',
                      border: approach === a.key ? '0.5px solid rgba(255,48,64,0.35)' : '0.5px solid var(--surface-border)',
                      transition: 'all 0.15s', fontFamily: 'var(--font-body)', textAlign: 'left',
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 3 }}>{a.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--w40)' }}>{a.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Credentials ── */}
        {step === 1 && (
          <div style={{ maxWidth: 580 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1.25rem' }}>Step 2 of 5</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Back it up.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w60)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Certificates are required. Athletes need to trust who they're working with.
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <label className="label" style={{ marginBottom: '0.875rem' }}>Your qualifications</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CRED_TYPES.map(c => pill(c, credTypes.includes(c), () => toggleCred(c)))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <label className="label" style={{ margin: 0 }}>Upload certificates</label>
                <button
                  onClick={() => certInputRef.current?.click()}
                  style={{
                    fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 50,
                    background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
                    color: 'var(--w60)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v8M3 5l3.5-4L10 5M2 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add file
                </button>
              </div>
              <input ref={certInputRef} type="file" accept="image/*,application/pdf" multiple onChange={onCertAdd} style={{ display: 'none' }} />

              {pendingCerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pendingCerts.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                          <rect x="1" y="1" width="12" height="14" rx="2" stroke="var(--w40)" strokeWidth="1.2"/>
                          <path d="M4 6h6M4 9h4" stroke="var(--w40)" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        <span style={{ fontSize: 13, color: 'var(--w70)' }}>{f.name}</span>
                      </div>
                      <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w40)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {pendingCerts.length === 0 && (
                <div style={{
                  padding: '1.5rem', borderRadius: 12, textAlign: 'center',
                  border: '0.5px dashed var(--surface-border)',
                }}>
                  <p style={{ fontSize: 13, color: 'var(--red)', opacity: 0.7 }}>At least one certificate is required to continue.</p>
                  <p style={{ fontSize: 12, color: 'var(--w50)', marginTop: 4 }}>PDF or image. Diplomas, certifications, accreditation letters.</p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="label" style={{ marginBottom: '0.875rem' }}>
                Languages you coach in <span style={{ color: 'var(--red)', fontSize: 10 }}>*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {LANGUAGES.map(l => pill(l, languages.includes(l), () => toggleLang(l)))}
              </div>
            </div>

            <div>
              <label className="label">LinkedIn <span style={{ color: 'var(--w40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input className="input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." style={{ fontSize: 15 }} />
            </div>
          </div>
        )}

        {/* ── Step 2: Sports + specialisms ── */}
        {step === 2 && (
          <div style={{ maxWidth: 620 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1.25rem' }}>Step 3 of 5</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Your<br />specialisms.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w60)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Athletes filter by sport and challenge. Pick everything that fits.
            </p>

            <div style={{ marginBottom: '2.5rem' }}>
              <label className="label" style={{ marginBottom: '0.875rem' }}>Sports you work with</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {SPORT_OPTIONS.map(s => pill(s, sports.includes(s), () => toggleSport(s)))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="label" style={{ marginBottom: '0.875rem' }}>
                Areas of focus <span style={{ color: 'var(--w40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {TAG_OPTIONS.map(t => pill(t, tags.includes(t), () => toggleTag(t)))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Coach Framework ── */}
        {step === 3 && (
          <div style={{ maxWidth: 580 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1.25rem' }}>Step 4 of 5</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3.75rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
              How do you actually<br />work with athletes?
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w60)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              One minute. In your own words.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <textarea
                className="input"
                value={frameworkText}
                onChange={e => setFrameworkText(e.target.value)}
                placeholder="Or write it here."
                rows={6}
                style={{ fontSize: 15, resize: 'vertical', minHeight: 140, lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 12, color: frameworkText.trim().split(/\s+/).filter(Boolean).length > 300 ? 'var(--red)' : 'var(--w40)', marginTop: 6, textAlign: 'right' }}>
                {frameworkText.trim().split(/\s+/).filter(Boolean).length} / 300 words
              </p>
            </div>

            <button
              onClick={generateFramework}
              disabled={!frameworkText.trim() || frameworkGenerating || frameworkGenerateCount >= 3}
              style={{
                fontSize: 15, fontWeight: 600, padding: '14px 28px', borderRadius: 50,
                background: frameworkText.trim() && !frameworkGenerating && frameworkGenerateCount < 3 ? 'rgba(255,48,64,0.12)' : 'var(--surface-1)',
                border: frameworkText.trim() && frameworkGenerateCount < 3 ? '0.5px solid rgba(255,48,64,0.4)' : '0.5px solid var(--surface-border)',
                color: frameworkText.trim() && frameworkGenerateCount < 3 ? 'var(--white)' : 'var(--w40)',
                cursor: frameworkText.trim() && !frameworkGenerating && frameworkGenerateCount < 3 ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s', marginBottom: '1.75rem',
              }}
            >
              {frameworkGenerating ? (
                <>
                  <Spinner size={14} />
                  Generating...
                </>
              ) : frameworkGenerateCount >= 3 ? 'Limit reached' : frameworkBullets ? 'Regenerate' : 'Generate'}
            </button>

            {frameworkError && (
              <p style={{ fontSize: 13, color: 'rgba(255,48,64,0.8)', marginBottom: '1.25rem' }}>{frameworkError}</p>
            )}

            {frameworkBullets && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '0.875rem' }}>Your coaching approach</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
                  {frameworkBullets.map((bullet, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 12, padding: '12px 14px' }}>
                      <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 14, marginTop: 1, flexShrink: 0 }}>—</span>
                      <textarea
                        value={bullet}
                        onChange={e => setFrameworkBullets(prev => prev ? prev.map((b, idx) => idx === i ? e.target.value : b) : prev)}
                        rows={2}
                        style={{
                          flex: 1, background: 'transparent', border: 'none', outline: 'none',
                          color: 'var(--white)', fontSize: 14, lineHeight: 1.6,
                          fontFamily: 'var(--font-body)', resize: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
                {!frameworkApproved ? (
                  <button
                    onClick={approveFramework}
                    style={{
                      fontSize: 15, fontWeight: 600, padding: '13px 32px', borderRadius: 50,
                      background: 'rgba(255,48,64,0.12)', border: '0.5px solid rgba(255,48,64,0.4)',
                      color: 'var(--white)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    }}
                  >
                    Approve
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--w60)', fontSize: 14 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Approved
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: 13, color: 'var(--w40)', marginTop: frameworkBullets ? 0 : '1rem' }}>
              This step is optional. You can add or edit it later from your profile.
            </p>
          </div>
        )}

        {/* ── Step 4: Rate + availability ── */}
        {step === 4 && (
          <div style={{ maxWidth: 520 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1.25rem' }}>Step 5 of 5</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Rate and<br />availability.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w60)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              You can edit these anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <label className="label">Hourly rate (CHF)</label>
                <input className="input" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 120" min={1} style={{ fontSize: 18, fontWeight: 600 }} />
              </div>

              <div>
                <label className="label" style={{ marginBottom: '0.875rem' }}>Session length</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Minimum</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[30, 45, 60].map(m => (
                        <button key={m} type="button" onClick={() => { setMinSession(m); if (maxSession < m) setMaxSession(m); }}
                          style={{ padding: '8px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s', border: minSession === m ? '1px solid var(--red)' : '0.5px solid var(--surface-border)', background: minSession === m ? 'rgba(255,48,64,0.10)' : 'var(--surface-1)', color: minSession === m ? 'var(--white)' : 'var(--w60)' }}>
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Maximum</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[60, 90, 120].map(m => (
                        <button key={m} type="button" onClick={() => { setMaxSession(m); if (minSession > m) setMinSession(m); }}
                          style={{ padding: '8px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s', border: maxSession === m ? '1px solid var(--red)' : '0.5px solid var(--surface-border)', background: maxSession === m ? 'rgba(255,48,64,0.10)' : 'var(--surface-1)', color: maxSession === m ? 'var(--white)' : 'var(--w60)' }}>
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="label" style={{ marginBottom: '0.875rem' }}>Weekly availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {slots.map((slot, i) => (
                    <div key={i} style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <select value={slot.day} onChange={e => updateSlot(i, 'day', e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--white)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer', flex: '1', minWidth: 100, outline: 'none' }}>
                        {DAYS.map(d => <option key={d} value={d} style={{ background: '#111' }}>{d}</option>)}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="time" value={slot.start} onChange={e => updateSlot(i, 'start', e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--w60)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: 'var(--w40)' }}>to</span>
                        <input type="time" value={slot.end} onChange={e => updateSlot(i, 'end', e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--w60)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' }} />
                      </div>
                      {slots.length > 1 && (
                        <button onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w40)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addSlot}
                    style={{ background: 'none', border: '0.5px dashed var(--w20)', borderRadius: 14, padding: '14px', color: 'var(--w40)', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--w60)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--w40)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--w40)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--w20)'; }}
                  >
                    + Add another slot
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <div style={{ textAlign: 'center', maxWidth: 440, margin: '0 auto', paddingTop: '8vh' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,48,64,0.12)', border: '0.5px solid rgba(255,48,64,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18l7 7L28 11" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 9vw, 5.5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
              You're in.
            </h1>
            <p style={{ fontSize: 17, color: 'var(--w60)', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 3rem' }}>
              Your profile is under review. Once approved, athletes can find and book you.
            </p>
            <button className="btn-primary" style={{ fontSize: 16, padding: '16px 48px' }} onClick={() => navigate('/coach-dashboard')}>
              Go to dashboard
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {step < 4 && (
        <div style={{ padding: '1.5rem 6vw 2.5rem', flexShrink: 0 }}>
          <button
            className="btn-primary"
            style={{ fontSize: 16, padding: '16px 0', width: '100%', maxWidth: 520, opacity: canAdvance ? 1 : 0.35 }}
            disabled={!canAdvance}
            onClick={() => setStep(s => s + 1)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 4 && (
        <div style={{ padding: '1.5rem 6vw 2.5rem', flexShrink: 0 }}>
          <button
            className="btn-primary"
            style={{ fontSize: 16, padding: '16px 0', width: '100%', maxWidth: 520, opacity: !rate || loading ? 0.35 : 1 }}
            disabled={!rate || loading}
            onClick={save}
          >
            {loading ? <Spinner size={18} /> : 'Submit profile'}
          </button>
        </div>
      )}
    </div>
  );
}
