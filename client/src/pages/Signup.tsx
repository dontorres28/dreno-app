import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { humanizeError } from '../lib/humanizeError';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';
import ThemeToggle from '../components/ThemeToggle';
import LanguagePicker from '../components/LanguagePicker';
import Logo from '../components/Logo';
import FloatingField from '../components/FloatingField';
import { PersonSimpleRun, ClipboardText, Buildings, EnvelopeSimple } from '@phosphor-icons/react';

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
  const { applySession } = useAuth();
  const [role, setRole] = useState<'athlete' | 'coach' | 'administrator' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) { toast.error(t('signup.pickRole')); return; }
    if (!agreed) { toast.error('Please accept the Terms and Privacy Policy to continue.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error('Sign up failed');

      const { error: profErr } = await supabase.from('profiles').insert({ id: uid, role, email });
      if (profErr) throw profErr;

      // Hydrate the auth context with the new session before entering a guarded
      // onboarding route, so it doesn't bounce to /login while the listener lags.
      const sess = data.session ?? (await supabase.auth.getSession()).data.session;
      await applySession(sess);

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
      toast.error(humanizeError(err, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  }

  function requireRole(provider: 'google' | 'apple') {
    if (!role) { toast.error('Pick your role first, then continue with ' + (provider === 'google' ? 'Google' : 'Apple') + '.'); return false; }
    if (!agreed) { toast.error('Please accept the Terms and Privacy Policy to continue.'); return false; }
    return true;
  }

  async function signUpWithGoogle() {
    if (!requireRole('google')) return;
    setOauthLoading('google');
    sessionStorage.setItem('dreno_pending_role', role!);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT_URL } });
    if (error) { toast.error(humanizeError(error)); setOauthLoading(null); }
  }

  async function signUpWithApple() {
    if (!requireRole('apple')) return;
    setOauthLoading('apple');
    sessionStorage.setItem('dreno_pending_role', role!);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: REDIRECT_URL } });
    if (error) { toast.error(humanizeError(error)); setOauthLoading(null); }
  }

  const anyLoading = loading || !!oauthLoading;

  return (
    <div className="bg-wash" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
          <Logo size="md" />
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
              { key: 'athlete', label: 'Athlete', Icon: PersonSimpleRun },
              { key: 'coach', label: 'Coach', Icon: ClipboardText },
              { key: 'administrator', label: 'Admin', Icon: Buildings },
            ] as const).map(r => {
              const on = role === r.key;
              return (
                <button key={r.key} type="button" onClick={() => setRole(r.key)} style={{
                  padding: '20px 8px', borderRadius: 14,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  background: on ? 'var(--red)' : 'var(--surface-1)',
                  border: on ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                  color: on ? 'var(--btn-ink)' : 'var(--w80)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}>
                  <r.Icon size={28} weight={on ? 'fill' : 'regular'} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: on ? 'var(--btn-ink)' : 'var(--white)' }}>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Terms/Privacy consent, required before any auth method fires. */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 2px', marginBottom: '1rem',
            cursor: 'pointer', userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }}
              aria-describedby="consent-desc"
            />
            <span id="consent-desc" style={{ fontSize: 13, color: 'var(--w70)', lineHeight: 1.5 }}>
              I agree to Dreno's{' '}
              <Link to="/legal/terms" style={{ color: 'var(--red)' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/legal/privacy" style={{ color: 'var(--red)' }}>Privacy Policy</Link>.
            </span>
          </label>

          {/* Auth buttons, only clickable once role selected + terms agreed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
            <SocialButton onClick={signUpWithGoogle} disabled={anyLoading || !role || !agreed}>
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

            <SocialButton onClick={signUpWithApple} disabled={anyLoading || !role || !agreed}>
              {oauthLoading === 'apple' ? <Spinner size={16} /> : (
                <svg width="18" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Continue with Apple
            </SocialButton>
          </div>

          {/* Collapsible email option, outline pill in the LanguagePicker family:
              same weight as OAuth buttons above but one tier subtler (transparent
              fill) so OAuth stays the preferred path. */}
          {!showEmail ? (
            <>
              <style>{`
                .email-pill {
                  width: 100%; height: 44px; padding: 0 16px; border-radius: 50px;
                  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                  background: transparent;
                  border: 0.5px solid var(--surface-border-2);
                  color: var(--w70);
                  font-family: var(--font-body); font-size: 14px; font-weight: 500;
                  letter-spacing: -0.005em;
                  cursor: pointer;
                  -webkit-tap-highlight-color: transparent;
                  transition:
                    background 200ms cubic-bezier(0.23, 1, 0.32, 1),
                    color 200ms cubic-bezier(0.23, 1, 0.32, 1),
                    border-color 200ms cubic-bezier(0.23, 1, 0.32, 1),
                    transform 90ms cubic-bezier(0.4, 0, 1, 1);
                  margin-top: 4px;
                }
                .email-pill:hover:not(:disabled) { background: var(--surface-2); color: var(--white); border-color: var(--line-2); }
                .email-pill:active:not(:disabled) { transform: scale(0.98); }
                .email-pill:disabled { opacity: 0.4; cursor: not-allowed; }
                @media (prefers-reduced-motion: reduce) { .email-pill:active:not(:disabled) { transform: none; } }
              `}</style>
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                disabled={!role || !agreed}
                className="email-pill"
                aria-label="Sign up with email instead"
              >
                <EnvelopeSimple size={16} weight="regular" aria-hidden />
                Use email instead
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <FloatingField
                label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" style={{ fontSize: 15 }} autoFocus
              />
              <FloatingField
                label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="new-password" minLength={8} style={{ fontSize: 15 }}
              />
              <button type="submit" className="btn-primary" style={{ fontSize: 15, height: 48, padding: 0, marginTop: 2 }} disabled={anyLoading || !role || !agreed}>
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
