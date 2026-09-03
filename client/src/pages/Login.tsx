import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';
import ThemeToggle from '../components/ThemeToggle';
import { startAuthentication } from '@simplewebauthn/browser';

const LANGUAGES = Object.keys(LANGUAGE_CODES);
const REDIRECT_URL = `${window.location.origin}/auth/callback`;
const SERVER_URL = import.meta.env.VITE_SERVER_URL as string;

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
        color: 'var(--white)', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
    >
      {children}
    </button>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | 'passkey' | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid) {
        if (!rememberMe) {
          const clearSession = () => {
            Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
          };
          window.addEventListener('beforeunload', clearSession, { once: true });
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single();
        const dest = profile?.role === 'coach' ? '/coach-dashboard' : profile?.role === 'administrator' ? '/admin-dashboard' : '/dashboard';
        navigate(dest);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setOauthLoading('google');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT_URL } });
    if (error) { toast.error(error.message); setOauthLoading(null); }
  }

  async function signInWithApple() {
    setOauthLoading('apple');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: REDIRECT_URL } });
    if (error) { toast.error(error.message); setOauthLoading(null); }
  }

  async function signInWithPasskey() {
    setOauthLoading('passkey');
    try {
      const optRes = await fetch(`${SERVER_URL}/api/auth/passkey/login-options`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const options = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verRes = await fetch(`${SERVER_URL}/api/auth/passkey/login-verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assertion),
      });
      const { session, error } = await verRes.json();
      if (error) throw new Error(error);
      if (session) {
        await supabase.auth.setSession(session);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        const dest = profile?.role === 'coach' ? '/coach-dashboard' : profile?.role === 'administrator' ? '/admin-dashboard' : '/dashboard';
        navigate(dest);
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') toast.error(err.message ?? 'Passkey sign in failed');
    } finally {
      setOauthLoading(null);
    }
  }

  const anyLoading = loading || !!oauthLoading;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left branding panel */}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: 8 }}>
          <LanguagePicker /><ThemeToggle />
        </div>
        <div className="md:hidden" style={{ marginBottom: '3rem' }}>
          <span style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--white)' }}>DRENO</span><span style={{ color: 'var(--red)' }}>/</span>
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 3.75rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            {t('login.welcomeBack')}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--w40)', marginBottom: '2rem' }}>{t('login.subtitle')}</p>

          {/* Social + passkey buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
            <SocialButton onClick={signInWithGoogle} disabled={anyLoading}>
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

            <SocialButton onClick={signInWithApple} disabled={anyLoading}>
              {oauthLoading === 'apple' ? <Spinner size={16} /> : (
                <svg width="17" height="17" viewBox="0 0 814 1000" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 457.8 37.4 327 37.4 261.7c0-25.5 2.5-51 12.6-74.9C67.7 148 112.8 108 162.6 91.5c35.7-11.9 71.9-17.9 108.2-17.9 138.6 0 180.1 91.5 259.1 91.5 77.5 0 128.5-91.5 261.9-91.5 36.3 0 107.8 6.4 161.3 70.5zm-126.4-177.2c0 50.6-17.9 101.2-50.2 135.4-36.3 38.1-80.4 60.6-127.5 60.6-8.3 0-16.7-.6-22.2-1.9 2.5-51.2 21.4-100.6 51.2-134.8 30.5-35.7 80.4-62.8 128.5-67.3 1.9 2.5 20.2 7.7 20.2 7.7z"/>
                </svg>
              )}
              Continue with Apple
            </SocialButton>

            <SocialButton onClick={signInWithPasskey} disabled={anyLoading}>
              {oauthLoading === 'passkey' ? <Spinner size={16} /> : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="4"/><path d="M16 19a4 4 0 0 0-8 0"/><path d="M19 11v6"/><path d="M22 14h-6"/>
                </svg>
              )}
              Use a passkey
            </SocialButton>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', opacity: 0.35 }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--white)' }} />
            <span style={{ fontSize: 12 }}>or sign in with email</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--white)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">{t('login.email')}</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder={t('login.emailPlaceholder')} autoComplete="email" />
            </div>
            <div>
              <label className="label">{t('login.password')}</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={t('login.passwordPlaceholder')} autoComplete="current-password" />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <span onClick={() => setRememberMe(r => !r)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: rememberMe ? 'var(--red)' : 'var(--input-bg)', border: rememberMe ? '0.5px solid var(--red)' : '0.5px solid var(--input-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, border-color 0.15s' }}>
                {rememberMe && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span onClick={() => setRememberMe(r => !r)} style={{ fontSize: 14, color: 'var(--w50)' }}>Remember me</span>
            </label>

            <button type="submit" className="btn-primary" style={{ fontSize: 16, padding: '15px', marginTop: '0.25rem' }} disabled={anyLoading}>
              {loading ? <Spinner size={18} /> : t('login.signIn')}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--w40)', marginTop: '2rem' }}>
            {t('login.noAccount')}{' '}
            <Link to="/signup" style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{t('login.signUp')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
