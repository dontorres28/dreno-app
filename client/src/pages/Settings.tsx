import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';
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
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)', marginBottom: '0.875rem', paddingLeft: 4 }}>
        {title}
      </p>
      <div style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border-2)',
        borderRadius: 18,
        overflow: 'hidden',
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
      borderBottom: border ? '0.5px solid var(--surface-border)' : 'none',
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
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '2rem' }}>
          {t('settings.title')}
        </h1>

        {/* Profile hero — gradient card matching Dashboard next session / Coach profile */}
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

          <label style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #ff5566 0%, #FF3040 60%, #cc1e2c 100%)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 26,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', userSelect: 'none',
              boxShadow: avatarUrl ? 'none' : '0 4px 16px rgba(255,48,64,0.35)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (name ? name.trim()[0].toUpperCase() : email[0]?.toUpperCase())}
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--bg-2)', border: '0.5px solid var(--line-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}>
              {avatarUploading
                ? <Spinner size={12} />
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8.5l2.5-.5L10 2.5a1.414 1.414 0 0 0-2-2L2.5 6 2 8.5Z" stroke="var(--w80)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </div>
          </label>

          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name || 'Your name'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--w70)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
          </div>
        </div>

        {/* Contact section */}
        <Section title={t('settings.profile')}>
          <div style={{ display: 'contents' }}>
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
                <span style={{ fontSize: 15, color: 'var(--w60)' }}>@</span>
                <input
                  value={instagram.replace(/^@/, '')}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="Optional"
                  style={{ ...inputStyle, maxWidth: 200 }}
                />
              </div>
            </Row>
          </div>
        </Section>

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
                  <path d="M2.5 6h7M7 3.5L9.5 6 7 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
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
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--w80)',
                padding: 0,
              }}
            >
              {theme === 'dark' ? t('settings.dark') : t('settings.light')}
              <span style={{ width: 40, height: 24, borderRadius: 50, background: theme === 'dark' ? 'var(--red)' : 'var(--surface-2)', position: 'relative', display: 'inline-block', flexShrink: 0, transition: 'background 220ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: 3, transform: `translateX(${theme === 'dark' ? 16 : 0}px)`, transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)', display: 'block', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
              </span>
            </button>
          </Row>
        </Section>

        {/* Account */}
        <Section title={t('settings.account')}>
          <Row label={t('settings.signOut')} border={false}>
            <button
              onClick={handleSignOut}
              className="signout-btn"
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
              {t('settings.signOut')}
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
          {saving ? <Spinner size={18} /> : t('settings.saveChanges')}
        </button>
      </div>
    </Layout>
  );
}
