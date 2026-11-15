import { useEffect, useRef, useState } from 'react';
import { CaretLeft, PencilSimple, UploadSimple, FileText } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ImageCropper from '../components/ImageCropper';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import FloatingField, { FloatingTextarea } from '../components/FloatingField';
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

/** Card-wrapped section, matches Settings/Playbook/Dashboard cards. */
function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ paddingLeft: 4, marginBottom: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--w70)' }}>{title}</p>
        {sub && <p style={{ fontSize: 12.5, color: 'var(--w60)', marginTop: 4 }}>{sub}</p>}
      </div>
      <div style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border-2)',
        borderRadius: 20,
        padding: '1.5rem',
      }}>
        {children}
      </div>
    </section>
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
  const [cropSource, setCropSource] = useState<File | null>(null);
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
    setCropSource(file);
    e.target.value = '';
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
        padding: '9px 16px', borderRadius: 50, fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
        background: active ? 'var(--red)' : 'var(--surface-1)',
        border: active ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
        color: active ? 'var(--btn-ink)' : 'var(--w80)',
      }}
    >
      {label}
    </button>
  );

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={28} /></div></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 8rem' }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--w70)', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 500, padding: '8px 0', marginBottom: '1.5rem',
            fontFamily: 'var(--font-body)',
            transition: 'color 220ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--w70)')}
        >
          <CaretLeft size={16} weight="bold" />
          Back
        </button>

        {/* ── Hero header ── */}
        <div className="squircle" style={{
          position: 'relative',
          background: 'var(--surface-1)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 22,
          padding: '1.5rem',
          marginBottom: '1.75rem',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <button
            onClick={() => photoRef.current?.click()}
            style={{
              position: 'relative', flexShrink: 0,
              width: 76, height: 76, borderRadius: '50%',
              background: photoPreview ? 'transparent' : 'var(--surface-2)',
              border: photoPreview ? 'none' : '0.5px solid var(--surface-border-2)',
              overflow: 'hidden', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--w70)', fontFamily: 'var(--font-display)', fontSize: 26,
              fontWeight: 700, letterSpacing: '-0.02em',
            }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (name.trim()[0]?.toUpperCase() ?? 'C')
            }
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--bg-2)', border: '0.5px solid var(--line-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}>
              <PencilSimple size={12} weight="bold" color="var(--w80)" />
            </span>
          </button>

          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)', letterSpacing: '-0.035em', lineHeight: 1, color: 'var(--white)', marginBottom: 6 }}>
              Edit profile
            </h1>
            <p style={{ fontSize: 14, color: 'var(--w70)' }}>
              How athletes see you on Dreno.
            </p>
          </div>
        </div>

        <input ref={photoRef} type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* ── Basic info ── */}
          <SectionCard title="Basic info">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <FloatingField label="Full name" value={name} onChange={e => setName(e.target.value)} />
              <FloatingField label="Headline" value={headline} onChange={e => setHeadline(e.target.value)} />
              <FloatingTextarea label="Bio (optional)" rows={5} value={bio} onChange={e => setBio(e.target.value)} />
            </div>
          </SectionCard>

          {/* ── Rate + session length ── */}
          <SectionCard title="Sessions" sub="Set your price and preferred session lengths.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ maxWidth: 200 }}>
                <FloatingField label="Hourly rate (CHF)" type="number" min={0} value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
              </div>
              <div>
                <label className="label">Minimum length</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {[30, 45, 60].map(m => pill(`${m} min`, minSession === m, () => { setMinSession(m); if (maxSession < m) setMaxSession(m); }))}
                </div>
              </div>
              <div>
                <label className="label">Maximum length</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {[60, 90, 120].map(m => pill(`${m} min`, maxSession === m, () => { setMaxSession(m); if (minSession > m) setMinSession(m); }))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Credentials ── */}
          <SectionCard title="Credentials" sub="Your qualifications and verified certificates.">
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Qualifications</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CRED_TYPES.map(c => pill(c, credTypes.includes(c), () => toggleTag(c, credTypes, setCredTypes)))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label className="label" style={{ marginBottom: 0 }}>Certificates</label>
                <button
                  onClick={() => certRef.current?.click()}
                  className="btn-secondary"
                  style={{ fontSize: 12, minHeight: 32, padding: '0 14px', gap: 5 }}
                >
                  <UploadSimple size={12} weight="bold" />
                  Upload
                </button>
              </div>
              <input ref={certRef} type="file" accept="image/*,application/pdf" multiple onChange={onCertAdd} style={{ display: 'none' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {certFiles.map(c => (
                  <div key={c.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)' }}>
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--w80)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} weight="regular" color="var(--w40)" />
                      {c.name}
                    </a>
                    <button onClick={() => removeCert(c.url)} aria-label="Remove certificate" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w60)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {pendingCerts.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'rgba(77,166,255,0.10)', border: '0.5px solid rgba(77,166,255,0.28)' }}>
                    <span style={{ fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                      <FileText size={16} weight="regular" color="var(--w40)" />
                      {f.name}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 50, background: 'rgba(77,166,255,0.20)', color: 'var(--red)', letterSpacing: '0.06em' }}>NEW</span>
                    </span>
                    <button onClick={() => removePending(i)} aria-label="Remove pending certificate" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {certFiles.length === 0 && pendingCerts.length === 0 && (
                  <div style={{
                    padding: '1.25rem 1rem', borderRadius: 12,
                    border: '0.5px dashed var(--surface-border-2)',
                    background: 'var(--surface-1)',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 4 }}>At least one certificate required</p>
                    <p style={{ fontSize: 12, color: 'var(--w70)' }}>PDF or image. Diplomas, certifications, accreditation letters.</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <FloatingField label="LinkedIn (optional)" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
            </div>
          </SectionCard>

          {/* ── Sports ── */}
          <SectionCard title="Sports" sub="Which sports do you work with?">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SPORT_OPTIONS.map(s => pill(s, sports.includes(s), () => toggleTag(s, sports, setSports)))}
            </div>
          </SectionCard>

          {/* ── Areas of focus ── */}
          <SectionCard title="Areas of focus" sub="Where you help athletes most.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {EXPERTISE_OPTIONS.map(t => pill(t, expertiseTags.includes(t), () => toggleTag(t, expertiseTags, setExpertiseTags)))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Sticky save CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        padding: '1rem 1.5rem 1.5rem',
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 52, width: '100%', padding: '0 32px' }}
            onClick={save}
            disabled={saving}
          >
            {saving ? <Spinner size={18} /> : 'Save profile'}
          </button>
        </div>
      </div>

      {cropSource && (
        <ImageCropper
          file={cropSource}
          onCancel={() => setCropSource(null)}
          onSave={(blob, preview) => {
            setPhotoFile(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            setPhotoPreview(preview);
            setCropSource(null);
          }}
        />
      )}
    </Layout>
  );
}
