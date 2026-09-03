import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';
import ThemeToggle from '../components/ThemeToggle';
import LanguagePicker from '../components/LanguagePicker';

const REDIRECT_URL = `${window.location.origin}/auth/callback`;

function SocialButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', height: 46, padding: '0 16px', borderRadius: 12,
        background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
        color: 'var(--white)', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--line-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.borderColor = 'var(--surface-border-2)'; }}
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
  const [showEmail, setShowEmail] = useState(false);

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
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', flexShrink: 0 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 32,
            fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: 20,
            letterSpacing: '-0.02em', lineHeight: 1, textDecoration: 'none',
          }}
        >
          <span style={{ color: 'var(--white)' }}>DRENO</span><span style={{ color: 'var(--red)' }}>/</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
          <LanguagePicker />
          <ThemeToggle />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1.5rem 3rem' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '2rem', color: 'var(--white)' }}>
            Sign up
          </h1>

          {/* Role tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1.25rem' }}>
            {([
              { key: 'athlete', label: 'Athlete', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="4.5" r="2.2"/>
                  <path d="M8 22l1.5-7 3-2 3 3 3 1"/>
                  <path d="M6 12l3-3 2 1 3-1"/>
                </svg>
              )},
              { key: 'coach', label: 'Coach', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l9 4-9 4-9-4 9-4z"/>
                  <path d="M7 9v4c0 1.7 2.2 3 5 3s5-1.3 5-3V9"/>
                  <path d="M21 7v5"/>
                </svg>
              )},
              { key: 'administrator', label: 'Admin', icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 21V10l8-5 8 5v11"/>
                  <path d="M9 21V13h6v8"/>
                </svg>
              )},
            ] as const).map(r => {
              const on = role === r.key;
              return (
                <button key={r.key} type="button" onClick={() => setRole(r.key)} style={{
                  padding: '20px 8px', borderRadius: 14,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  background: on ? 'var(--red)' : 'var(--surface-1)',
                  border: on ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                  color: on ? '#fff' : 'var(--w80)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                  {r.icon}
                  <span style={{ fontSize: 14, fontWeight: 600, color: on ? '#fff' : 'var(--white)' }}>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Auth buttons — only clickable once role selected */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
            <SocialButton onClick={signUpWithGoogle} disabled={anyLoading || !role}>
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

            <SocialButton onClick={signUpWithApple} disabled={anyLoading || !role}>
              {oauthLoading === 'apple' ? <Spinner size={16} /> : (
                <svg width="18" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Continue with Apple
            </SocialButton>
          </div>

          {/* Collapsible email option */}
          {!showEmail ? (
            <button type="button" onClick={() => setShowEmail(true)} disabled={!role} style={{
              width: '100%', padding: '10px', background: 'none', border: 'none',
              fontSize: 13, color: 'var(--w60)', fontFamily: 'var(--font-body)',
              cursor: role ? 'pointer' : 'not-allowed',
            }}>
              Use email instead
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <input
                className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="Email" autoComplete="email"
                style={{ height: 46, fontSize: 15 }} autoFocus
              />
              <input
                className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="Password" autoComplete="new-password" minLength={8}
                style={{ height: 46, fontSize: 15 }}
              />
              <button type="submit" className="btn-primary" style={{ fontSize: 15, height: 48, padding: 0, marginTop: 2 }} disabled={anyLoading || !role}>
                {loading ? <Spinner size={18} /> : 'Create account'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--w70)', marginTop: '2rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
