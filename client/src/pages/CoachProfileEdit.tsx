import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EXPERTISE_OPTIONS = [
  'Focus', 'Composure', 'Confidence', 'Pre-performance',
  'Pressure management', 'Team dynamics', 'Goal setting',
  'Identity', 'Injury recovery', 'Motivation',
];

const SPORT_OPTIONS = [
  'Ice hockey', 'Soccer', 'Basketball', 'Tennis', 'Swimming',
  'Athletics', 'Rugby', 'Cycling', 'Combat sports', 'Triathlon',
  'Gymnastics', 'Rowing', 'Volleyball', 'Baseball', 'Golf',
];

const CRED_TYPES = [
  'MSc Sport Psychology', 'BSc Sport Science', 'PhD', 'Coaching certificate',
  'BASES accredited', 'HCPC registered', 'Swiss Olympic certified',
  'Elite athlete background', 'CBT trained', 'Other',
];

interface CertFile { name: string; url: string; }

function parseCredentials(text: string): { types: string[]; files: CertFile[] } {
  if (!text) return { types: [], files: [] };
  try {
    const p = JSON.parse(text);
    return { types: p.types ?? [], files: p.files ?? [] };
  } catch {
    return { types: [], files: [] };
  }
}

async function uploadFile(file: File, userId: string, path: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const fullPath = `${userId}/${path}.${ext}`;
  const { error } = await supabase.storage.from('coach-files').upload(fullPath, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('coach-files').getPublicUrl(fullPath).data.publicUrl;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1.25rem' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function CoachProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [credTypes, setCredTypes] = useState<string[]>([]);
  const [certFiles, setCertFiles] = useState<CertFile[]>([]);
  const [pendingCerts, setPendingCerts] = useState<File[]>([]);
  const certRef = useRef<HTMLInputElement>(null);

  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [minSession, setMinSession] = useState(30);
  const [maxSession, setMaxSession] = useState(120);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [profileRes, coachRes] = await Promise.all([
          supabase.from('profiles').select('name').eq('id', user!.id).single(),
          supabase.from('coaches').select('*').eq('id', user!.id).single(),
        ]);
        if (profileRes.data) setName(profileRes.data.name ?? '');
        if (coachRes.data) {
          const c = coachRes.data;
          setHeadline(c.headline ?? '');
          setBio(c.bio ?? '');
          setLinkedinUrl(c.linkedin_url ?? '');
          setHourlyRate(c.hourly_rate?.toString() ?? '');
          setPhotoPreview(c.photo_url ?? '');
          setExpertiseTags(c.expertise_tags ?? []);
          setSports(c.sports ?? []);
          setMinSession(c.min_session_min ?? 30);
          setMaxSession(c.max_session_min ?? 120);
          const parsed = parseCredentials(c.credentials ?? '');
          setCredTypes(parsed.types);
          setCertFiles(parsed.files);
        }
      } catch { toast.error('Could not load profile'); }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  function toggleTag(tag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
  }

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

  function removeCert(url: string) {
    setCertFiles(p => p.filter(c => c.url !== url));
  }

  function removePending(i: number) {
    setPendingCerts(p => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      let finalPhotoUrl: string | undefined;
      if (photoFile) {
        try { finalPhotoUrl = await uploadFile(photoFile, user.id, 'avatar'); }
        catch { toast.error('Photo upload failed.'); }
      }

      const newCerts: CertFile[] = [];
      for (let i = 0; i < pendingCerts.length; i++) {
        try {
          const url = await uploadFile(pendingCerts[i], user.id, `cert-${Date.now()}-${i}`);
          newCerts.push({ name: pendingCerts[i].name, url });
        } catch { /* skip */ }
      }

      const allCerts = [...certFiles, ...newCerts];
      const credentials = JSON.stringify({ types: credTypes, files: allCerts });

      await Promise.all([
        supabase.from('profiles').update({ name }).eq('id', user.id),
        supabase.from('coaches').update({
          headline, bio, credentials,
          linkedin_url: linkedinUrl || null,
          hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
          min_session_min: minSession,
          max_session_min: maxSession,
          ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {}),
          expertise_tags: expertiseTags,
          sports,
        }).eq('id', user.id),
      ]);

      setCertFiles(allCerts);
      setPendingCerts([]);
      if (newCerts.length > 0) setPhotoFile(null);
      toast.success('Profile saved.');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 16px', borderRadius: 50, fontSize: 13, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
        background: active ? 'rgba(255,48,64,0.12)' : 'var(--surface-1)',
        border: active ? '0.5px solid rgba(255,48,64,0.4)' : '0.5px solid var(--surface-border)',
        color: active ? 'var(--white)' : 'var(--w55)',
      }}
    >
      {label}
    </button>
  );

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}><Spinner size={28} /></div></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)', lineHeight: 0.95, letterSpacing: '-0.03em' }}>
            Edit profile
          </h1>
          <button className="btn-primary" onClick={save} disabled={saving} style={{ fontSize: 14 }}>
            {saving ? <Spinner size={16} /> : 'Save'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* Photo */}
          <Section title="Photo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <button
                onClick={() => photoRef.current?.click()}
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
                <button onClick={() => photoRef.current?.click()} style={{ fontSize: 14, fontWeight: 500, color: 'var(--white)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>
                  {photoPreview ? 'Change photo' : 'Upload photo'}
                </button>
                <p style={{ fontSize: 12, color: 'var(--w50)', marginTop: 3 }}>JPG or PNG, max 5 MB</p>
              </div>
            </div>
            <input ref={photoRef} type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />
          </Section>

          {/* Basic info */}
          <Section title="Basic info">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="label">Headline</label>
                <input className="input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Focus and composure for contact sports" />
              </div>
              <div>
                <label className="label">Bio <span style={{ color: 'var(--w50)', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="input" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Your background and approach" style={{ resize: 'none', lineHeight: 1.65 }} />
              </div>
              <div>
                <label className="label">Hourly rate (CHF)</label>
                <input className="input" type="number" min={0} value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="e.g. 120" style={{ maxWidth: 160 }} />
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
            </div>
          </Section>

          {/* Credentials */}
          <Section title="Credentials">
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 13, color: 'var(--w40)', marginBottom: '0.875rem' }}>Your qualifications</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CRED_TYPES.map(c => pill(c, credTypes.includes(c), () => toggleTag(c, credTypes, setCredTypes)))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: 13, color: 'var(--w40)' }}>Certificates</p>
                <button
                  onClick={() => certRef.current?.click()}
                  style={{ fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 50, background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', color: 'var(--w55)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v7M2.5 4l3-3.5L8.5 4M1.5 9h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Upload
                </button>
              </div>
              <input ref={certRef} type="file" accept="image/*,application/pdf" multiple onChange={onCertAdd} style={{ display: 'none' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {certFiles.map(c => (
                  <div key={c.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)' }}>
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--w60)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><rect x="1" y="1" width="12" height="14" rx="2" stroke="var(--w40)" strokeWidth="1.2"/><path d="M4 6h6M4 9h4" stroke="var(--w40)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      {c.name}
                    </a>
                    <button onClick={() => removeCert(c.url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w50)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {pendingCerts.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,48,64,0.06)', border: '0.5px solid rgba(255,48,64,0.15)' }}>
                    <span style={{ fontSize: 13, color: 'var(--w60)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><rect x="1" y="1" width="12" height="14" rx="2" stroke="rgba(255,48,64,0.4)" strokeWidth="1.2"/><path d="M4 6h6M4 9h4" stroke="rgba(255,48,64,0.4)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      {f.name}
                    </span>
                    <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w50)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {certFiles.length === 0 && pendingCerts.length === 0 && (
                  <div style={{ padding: '1.25rem', borderRadius: 12, border: '0.5px dashed var(--surface-border)', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--red)', opacity: 0.7 }}>At least one certificate required.</p>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginTop: 3 }}>PDF or image. Diplomas, certifications, accreditation letters.</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <label className="label">LinkedIn <span style={{ color: 'var(--w50)', fontWeight: 400 }}>(optional)</span></label>
              <input className="input" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
          </Section>

          {/* Sports */}
          <Section title="Sports">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SPORT_OPTIONS.map(s => pill(s, sports.includes(s), () => toggleTag(s, sports, setSports)))}
            </div>
          </Section>

          {/* Areas of focus */}
          <Section title="Areas of focus">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {EXPERTISE_OPTIONS.map(t => pill(t, expertiseTags.includes(t), () => toggleTag(t, expertiseTags, setExpertiseTags)))}
            </div>
          </Section>

          <button className="btn-primary" style={{ fontSize: 15, padding: '14px 0', width: '100%' }} onClick={save} disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Save profile'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
