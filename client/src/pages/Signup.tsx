import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';
import { useTheme } from '../context/ThemeContext';

const LANGUAGES = Object.keys(LANGUAGE_CODES);
const REDIRECT_URL = `${window.location.origin}/auth/callback`;

function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => {
    const code = localStorage.getItem('i18nextLng') ?? 'en';
    return LANGUAGES.find(l => LANGUAGE_CODES[l] === code) ?? 'English';
  });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  function select(lang: string) { setCurrent(lang); setLanguageFromPreference(lang); setOpen(false); }
  const code = LANGUAGE_CODES[current]?.toUpperCase() ?? 'EN';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Change language" style={{ height: 34, padding: '0 12px', borderRadius: 20, background: 'var(--toggle-bg)', border: '0.5px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--w60)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '0.03em' }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><path d="M2 10h16"/><path d="M10 2a11 11 0 0 1 3 8 11 11 0 0 1-3 8 11 11 0 0 1-3-8 11 11 0 0 1 3-8z"/></svg>
        {code}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 200, background: 'var(--bg-2)', border: '0.5px solid var(--line-2)', borderRadius: 14, padding: '6px 0', minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', maxHeight: 280, overflowY: 'auto' }}>
          {LANGUAGES.map(lang => (
            <button key={lang} onClick={() => select(lang)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer', color: lang === current ? 'var(--white)' : 'var(--w60)', fontWeight: lang === current ? 600 : 400 }}>
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggleSmall() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button onClick={toggle} aria-label="Toggle theme" style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--toggle-bg)', border: '0.5px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--w60)', position: 'relative', overflow: 'hidden' }}>
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', opacity: isDark ? 0 : 1, transform: isDark ? 'scale(0.4)' : 'scale(1)', transition: 'opacity 0.22s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', opacity: isDark ? 1 : 0, transform: isDark ? 'scale(1)' : 'scale(0.4)', transition: 'opacity 0.22s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <path d="M12 9.3A5.5 5.5 0 0 1 4.7 2a5.5 5.5 0 1 0 7.3 7.3Z" fill="currentColor"/>
      </svg>
    </button>
  );
}

function SocialButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '13px 16px', borderRadius: 12,
        background: 'var(--input-bg)', border: '0.5px solid var(--input-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
        color: 'var(--white)', cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
    >
      {children}
    </button>
  );
}

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState<'athlete' | 'coach' | 'administrator' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) { toast.error(t('signup.pickRole')); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error('Sign up failed');

      const { error: profErr } = await supabase.from('profiles').insert({ id: uid, role, email });
      if (profErr) throw profErr;

      if (role === 'athlete') {
        await supabase.from('athletes').insert({ id: uid });
        navigate('/onboarding/athlete');
      } else if (role === 'coach') {
        await supabase.from('coaches').insert({ id: uid });
        navigate('/onboarding/coach');
      } else {
        await supabase.from('administrators').insert({ id: uid });
        navigate('/onboarding/admin');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  function requireRole(provider: 'google' | 'apple') {
    if (!role) { toast.error('Pick your role first, then continue with ' + (provider === 'google' ? 'Google' : 'Apple') + '.'); return false; }
    return true;
  }

  async function signUpWithGoogle() {
    if (!requireRole('google')) return;
    setOauthLoading('google');
    sessionStorage.setItem('dreno_pending_role', role!);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT_URL } });
    if (error) { toast.error(error.message); setOauthLoading(null); }
  }

  async function signUpWithApple() {
    if (!requireRole('apple')) return;
    setOauthLoading('apple');
    sessionStorage.setItem('dreno_pending_role', role!);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: REDIRECT_URL } });
    if (error) { toast.error(error.message); setOauthLoading(null); }
  }

  const anyLoading = loading || !!oauthLoading;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left branding */}
      <div className="hidden md:flex" style={{ width: '45%', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem', background: 'var(--bg-2)', borderRight: '0.5px solid var(--line)' }}>
        <span style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--white)' }}>DRENO</span><span style={{ color: 'var(--red)' }}>/</span>
        </span>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>{t('login.tagline')}</p>
          <p style={{ fontSize: 14, color: 'var(--w40)', lineHeight: 1.7, maxWidth: 280 }}>{t('login.taglineSub')}</p>
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', position: 'relative', overflowY: 'auto' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: 8 }}>
          <LanguagePicker /><ThemeToggleSmall />
        </div>
        <div className="md:hidden" style={{ marginBottom: '2.5rem' }}>
          <span style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--white)' }}>DRENO</span><span style={{ color: 'var(--red)' }}>/</span>
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 3.75rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Start here.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--w40)', marginBottom: '2rem' }}>Pick your role to get started.</p>

          {/* Role cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.75rem' }}>
            {([
              { key: 'athlete', label: t('signup.iAmAthlete'), sub: 'Track your mental performance' },
              { key: 'coach', label: t('signup.iAmCoach'), sub: 'Support and monitor your athletes' },
              { key: 'administrator', label: "I'm an administrator", sub: 'Schools, clubs, sports programs' },
            ] as const).map(r => (
              <button key={r.key} type="button" onClick={() => setRole(r.key)} style={{
                width: '100%', padding: '13px 16px', borderRadius: 12, textAlign: 'left',
                fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s',
                background: role === r.key ? 'rgba(255,48,64,0.10)' : 'var(--input-bg)',
                border: role === r.key ? '0.5px solid rgba(255,48,64,0.45)' : '0.5px solid var(--input-border)',
                color: role === r.key ? 'var(--white)' : 'var(--w50)',
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{r.label}</p>
                <p style={{ fontSize: 12, opacity: 0.6 }}>{r.sub}</p>
              </button>
            ))}
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
            <SocialButton onClick={signUpWithGoogle} disabled={anyLoading}>
              {oauthLoading === 'google' ? <Spinner size={16} /> : (
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" fill="#FFC107"/>
                  <path d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00"/>
                  <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.5 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.7 35.6 16.3 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C37.1 38.5 44 33 44 24c0-1.3-.1-2.6-.4-3.9z" fill="#1976D2"/>
                </svg>
              )}
              Continue with Google
            </SocialButton>

            <SocialButton onClick={signUpWithApple} disabled={anyLoading}>
              {oauthLoading === 'apple' ? <Spinner size={16} /> : (
                <svg width="17" height="17" viewBox="0 0 814 1000" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 457.8 37.4 327 37.4 261.7c0-25.5 2.5-51 12.6-74.9C67.7 148 112.8 108 162.6 91.5c35.7-11.9 71.9-17.9 108.2-17.9 138.6 0 180.1 91.5 259.1 91.5 77.5 0 128.5-91.5 261.9-91.5 36.3 0 107.8 6.4 161.3 70.5zm-126.4-177.2c0 50.6-17.9 101.2-50.2 135.4-36.3 38.1-80.4 60.6-127.5 60.6-8.3 0-16.7-.6-22.2-1.9 2.5-51.2 21.4-100.6 51.2-134.8 30.5-35.7 80.4-62.8 128.5-67.3 1.9 2.5 20.2 7.7 20.2 7.7z"/>
                </svg>
              )}
              Continue with Apple
            </SocialButton>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', opacity: 0.35 }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--white)' }} />
            <span style={{ fontSize: 12 }}>or sign up with email</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--white)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">{t('signup.email')}</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder={t('signup.emailPlaceholder')} autoComplete="email" style={{ fontSize: 16 }} />
            </div>
            <div>
              <label className="label">{t('signup.password')}</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={t('signup.passwordPlaceholder')} autoComplete="new-password" minLength={8} style={{ fontSize: 16 }} />
            </div>

            <p style={{ fontSize: 11, color: 'var(--w40)', lineHeight: 1.6, textAlign: 'center' }}>{t('signup.disclaimer')}</p>

            <button type="submit" className="btn-primary" style={{ fontSize: 16, padding: '15px', marginTop: '0.25rem' }} disabled={anyLoading || !role}>
              {loading ? <Spinner size={18} /> : t('signup.createAccountBtn')}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--w40)', marginTop: '2rem' }}>
            {t('signup.alreadyHaveAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{t('signup.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
