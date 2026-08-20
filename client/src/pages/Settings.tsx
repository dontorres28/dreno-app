import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { setLanguageFromPreference } from '../i18n';
import toast from 'react-hot-toast';

const SPORTS = [
  'Ice hockey', 'Soccer', 'Basketball', 'Tennis', 'Swimming',
  'Athletics', 'Rugby', 'Cycling', 'Combat sports', 'Triathlon',
  'Gymnastics', 'Rowing', 'Volleyball', 'Baseball', 'Golf', 'Other',
];

const LEVELS = [
  'Recreational', 'Club', 'Regional', 'National', 'Professional', 'Elite',
];

const TIMEZONES = [
  'Europe/London', 'Europe/Zurich', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Australia/Sydney', 'Asia/Tokyo', 'Asia/Singapore',
];

const FORMATS = [
  { key: 'video', label: 'Video call' },
  { key: 'in_person', label: 'In person' },
  { key: 'either', label: 'Either' },
];

const LANGUAGES = [
  'English', 'German', 'French', 'Italian', 'Spanish', 'Portuguese',
  'Dutch', 'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Romanian', 'Russian', 'Turkish', 'Arabic', 'Chinese', 'Japanese',
  'Korean', 'Hindi',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>
        {title}
      </p>
      <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, border = true }: { label: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px',
      borderBottom: border ? '0.5px solid var(--surface-border)' : 'none',
      gap: '1rem',
    }}>
      <p style={{ fontSize: 14, color: 'var(--w60)', flexShrink: 0 }}>{label}</p>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)',
  textAlign: 'right', width: '100%', maxWidth: 240,
};

const selectStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)',
  textAlign: 'right', cursor: 'pointer',
};

export default function Settings() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const isCoach = profile?.role === 'coach';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Shared
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Athlete
  const [sport, setSport] = useState('');
  const [level, setLevel] = useState('');
  const [timezone, setTimezone] = useState('');
  const [format, setFormat] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    if (!user || !profile) return;
    setEmail(user.email ?? '');
    setName(profile.name ?? '');
    setPhone((profile as any).phone ?? '');
    setInstagram((profile as any).instagram ?? '');
    setAvatarUrl((profile as any).avatar_url ?? '');

    if (!isCoach) {
      supabase.from('athletes').select('sport, competition_level, timezone, session_format_pref')
        .eq('id', user.id).single()
        .then(async ({ data }) => {
          if (data) {
            setSport(data.sport ?? '');
            setLevel(data.competition_level ?? '');
            setTimezone(data.timezone ?? '');
            setFormat(data.session_format_pref ?? '');
          }
          const { data: userData } = await supabase.auth.getUser();
          setLanguage(userData?.user?.user_metadata?.language ?? '');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      toast.success('Photo updated.');
    } catch {
      toast.error('Could not upload photo.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const currentEmail = user.email ?? '';
      await supabase.from('profiles').update({
        name,
        phone: phone || null,
        instagram: instagram.replace(/^@/, '') || null,
      }).eq('id', user.id);

      const promises: Promise<any>[] = [];

      if (email !== currentEmail) {
        promises.push(supabase.auth.updateUser({ email }).then(({ error }) => {
          if (error) throw error;
          toast('Check your new email to confirm the change.', { icon: '✉️' });
        }));
      }

      if (!isCoach) {
        promises.push(
          Promise.resolve(
            supabase.from('athletes').update({
              sport: sport || null,
              competition_level: level || null,
              timezone: timezone || null,
              session_format_pref: format || null,
            }).eq('id', user.id)
          ),
        );
        if (language) {
          promises.push(supabase.auth.updateUser({ data: { language } }).then(() => setLanguageFromPreference(language)));
        }
      }

      await Promise.all(promises);
      await refreshProfile();
      toast.success('Saved.');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={32} /></div></Layout>;
  }

  return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2.5rem' }}>
          {t('settings.title')}
        </h1>

        {/* Profile — Apple-style */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>
            {t('settings.profile')}
          </p>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label style={{ cursor: 'pointer', position: 'relative' }}>
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: avatarUrl ? 'transparent' : 'var(--red)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 28,
                fontFamily: 'var(--font-display)', userSelect: 'none',
                border: '2px solid var(--surface-border)',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (name ? name.trim()[0].toUpperCase() : email[0]?.toUpperCase())}
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--bg-2)', border: '1.5px solid var(--surface-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarUploading
                  ? <Spinner size={12} />
                  : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 8.5l2.5-.5L10 2.5a1.414 1.414 0 0 0-2-2L2.5 6 2 8.5Z" stroke="var(--w60)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
              </div>
            </label>
            <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: '0.625rem' }}>
              {avatarUploading ? 'Uploading...' : 'Tap to change photo'}
            </p>
          </div>

          {/* Fields */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, overflow: 'hidden' }}>
            <Row label={t('settings.name')}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('settings.namePlaceholder')}
                style={inputStyle}
              />
            </Row>
            <Row label={t('settings.email')}>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                style={inputStyle}
              />
            </Row>
            <Row label="Phone">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
                placeholder="Optional"
                style={inputStyle}
              />
            </Row>
            <Row label="Instagram" border={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 14, color: 'var(--w40)' }}>@</span>
                <input
                  value={instagram.replace(/^@/, '')}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="Optional"
                  style={{ ...inputStyle, maxWidth: 200 }}
                />
              </div>
            </Row>
          </div>
        </div>

        {/* Athlete-specific */}
        {!isCoach && (
          <Section title={t('settings.trainingProfile')}>
            <Row label={t('settings.sport')}>
              <select value={sport} onChange={e => setSport(e.target.value)} style={selectStyle}>
                <option value="">{t('common.select')}</option>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <Row label={t('settings.level')}>
              <select value={level} onChange={e => setLevel(e.target.value)} style={selectStyle}>
                <option value="">{t('common.select')}</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Row>
            <Row label={t('settings.timezone')}>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={selectStyle}>
                <option value="">{t('common.select')}</option>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
              </select>
            </Row>
            <Row label={t('settings.sessionFormat')}>
              <select value={format} onChange={e => setFormat(e.target.value)} style={selectStyle}>
                <option value="">{t('common.select')}</option>
                {FORMATS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </Row>
            <Row label={t('settings.preferredLanguage')} border={false}>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={selectStyle}>
                <option value="">{t('common.select')}</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Row>
          </Section>
        )}

        {/* Coach shortcut */}
        {isCoach && (
          <Section title={t('settings.coachProfile')}>
            <Row label={t('settings.editProfile')} border={false}>
              <button
                onClick={() => navigate('/coach/profile/edit')}
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {t('settings.open')}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6h7M7 3.5L9.5 6 7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Row>
          </Section>
        )}

        {/* Appearance */}
        <Section title={t('settings.appearance')}>
          <Row label={t('settings.theme')} border={false}>
            <button
              onClick={toggle}
              className="toggle-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--w60)',
              }}
            >
              {theme === 'dark' ? t('settings.dark') : t('settings.light')}
              <span style={{ width: 40, height: 23, borderRadius: 12, background: 'var(--surface-border)', position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                <span style={{ width: 17, height: 17, borderRadius: '50%', background: 'var(--white)', position: 'absolute', top: 3, left: 3, transform: `translateX(${theme === 'dark' ? 17 : 0}px)`, transition: 'transform 0.2s ease', display: 'block', willChange: 'transform' }} />
              </span>
            </button>
          </Row>
        </Section>

        {/* Account */}
        <Section title={t('settings.account')}>
          <Row label={t('settings.signOut')} border={false}>
            <button
              onClick={handleSignOut}
              className="btn-danger"
              style={{ fontSize: 13, padding: '7px 16px' }}
            >
              {t('settings.signOut')}
            </button>
          </Row>
        </Section>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
          style={{ width: '100%', padding: '15px', fontSize: 15, marginTop: '0.5rem' }}
        >
          {saving ? <Spinner size={18} /> : t('settings.saveChanges')}
        </button>
      </div>
    </Layout>
  );
}
