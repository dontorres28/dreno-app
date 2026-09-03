import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';

const LANGUAGES = Object.keys(LANGUAGE_CODES);

function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => {
    const code = localStorage.getItem('i18nextLng') ?? 'en';
    return LANGUAGES.find(l => LANGUAGE_CODES[l] === code) ?? 'English';
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(lang: string) {
    setCurrent(lang);
    setLanguageFromPreference(lang);
    setOpen(false);
  }

  const code = LANGUAGE_CODES[current]?.toUpperCase() ?? 'EN';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change language"
        style={{
          height: 34, padding: '0 12px', borderRadius: 20,
          background: 'var(--toggle-bg)', border: '0.5px solid var(--line-2)',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', color: 'var(--w60)', flexShrink: 0,
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
          letterSpacing: '0.03em', transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--w40)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="10" cy="10" r="8"/>
          <path d="M2 10h16"/>
          <path d="M10 2a11 11 0 0 1 3 8 11 11 0 0 1-3 8 11 11 0 0 1-3-8 11 11 0 0 1 3-8z"/>
        </svg>
        {code}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, zIndex: 200,
          background: 'var(--bg-2)', border: '0.5px solid var(--line-2)',
          borderRadius: 14, padding: '6px 0', minWidth: 160,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {LANGUAGES.map(lang => (
            <button key={lang} onClick={() => select(lang)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', background: 'none', border: 'none',
              fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
              color: lang === current ? 'var(--white)' : 'var(--w60)',
              fontWeight: lang === current ? 600 : 400,
            }}>
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isCoach = profile?.role === 'coach';
  const isAdmin = profile?.role === 'administrator';

  const athleteLinks = [
    { label: t('nav.dashboard'), to: '/dashboard' },
    { label: t('nav.coaches'), to: '/coaches' },
    { label: t('nav.drills'), to: '/drills' },
    { label: t('nav.goals'), to: '/goals' },
    { label: t('nav.journal'), to: '/journal' },
    { label: 'Playbook', to: '/playbook' },
    { label: t('nav.messages'), to: '/messages' },
  ];

  const coachLinks = [
    { label: t('nav.dashboard'), to: '/coach-dashboard' },
    { label: t('nav.messages'), to: '/messages' },
    { label: t('nav.profile'), to: '/coach/profile/edit' },
  ];

  const adminLinks = [
    { label: 'Dashboard', to: '/admin-dashboard' },
    { label: 'Athletes', to: '/admin/athletes' },
    { label: 'Settings', to: '/admin/settings' },
  ];

  const links = user ? (isAdmin ? adminLinks : isCoach ? coachLinks : athleteLinks) : [];
  const isActive = (to: string) => location.pathname === to;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        background: 'var(--nav-bg)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '0.5px solid var(--nav-border)',
      }}
    >
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={user ? (isAdmin ? '/admin-dashboard' : isCoach ? '/coach-dashboard' : '/dashboard') : '/'}>
          <Logo size="sm" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '6px 14px',
                    borderRadius: 50,
                    color: isActive(l.to) ? 'var(--white)' : 'var(--w60)',
                    background: isActive(l.to) ? 'var(--surface-1)' : 'transparent',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                >
                  {l.label}
                </Link>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <ThemeToggle />
              <Link
                to={isAdmin ? '/admin/settings' : '/settings'}
                className={`settings-link${isActive(isAdmin ? '/admin/settings' : '/settings') ? ' rotated' : ''}`}
                style={{
                  width: 34, height: 34, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: isActive('/settings') ? 'var(--white)' : 'var(--w60)',
                  background: 'var(--toggle-bg)',
                  border: '0.5px solid var(--line-2)',
                  flexShrink: 0,
                  transition: 'color 0.15s, background 0.2s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
                </svg>
              </Link>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{ fontSize: 14, fontWeight: 500, padding: '6px 14px', color: 'var(--w60)', borderRadius: 50 }}
              >
                {t('nav.signIn')}
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LanguagePicker />
                <ThemeToggle />
              </div>
              <Link to="/signup" className="btn-primary" style={{ padding: '8px 20px', fontSize: 14, marginLeft: 8 }}>
                {t('nav.getStarted')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: toggle + burger */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--w60)' }}
            aria-label="Menu"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M1 1h18M1 7h12M1 13h18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            background: 'var(--mobile-menu-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '12px 24px 24px',
            borderBottom: '0.5px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {user ? (
            <>
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  style={{ fontSize: 16, fontWeight: 500, padding: '12px 0', color: isActive(l.to) ? 'var(--white)' : 'var(--w60)' }}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/settings" onClick={() => setOpen(false)} style={{ fontSize: 16, fontWeight: 500, padding: '12px 0', color: isActive('/settings') ? 'var(--white)' : 'var(--w60)' }}>
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link to="/coaches" onClick={() => setOpen(false)} style={{ fontSize: 16, fontWeight: 500, padding: '12px 0', color: 'var(--w60)' }}>Find a coach</Link>
              <Link to="/login" onClick={() => setOpen(false)} style={{ fontSize: 16, fontWeight: 500, padding: '12px 0', color: 'var(--w60)' }}>Sign in</Link>
              <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary" style={{ marginTop: 12, textAlign: 'center' }}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
