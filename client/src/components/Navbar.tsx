import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';

const LANGUAGES = Object.keys(LANGUAGE_CODES);

function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('English');
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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change language"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--toggle-bg)', border: '0.5px solid var(--line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--w60)', flexShrink: 0,
          transition: 'background 0.2s, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="10" cy="10" r="8"/>
          <path d="M2 10h16"/>
          <path d="M10 2a11 11 0 0 1 3 8 11 11 0 0 1-3 8 11 11 0 0 1-3-8 11 11 0 0 1 3-8z"/>
        </svg>
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
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
            onMouseLeave={e => (e.currentTarget.style.color = lang === current ? 'var(--white)' : 'var(--w60)')}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun — visible in light mode */}
      <svg
        width="15" height="15" viewBox="0 0 20 20" fill="none"
        style={{
          position: 'absolute',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(60deg) scale(0.4)' : 'rotate(0deg) scale(1)',
          transition: 'opacity 0.22s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {/* Moon — visible in dark mode */}
      <svg
        width="14" height="14" viewBox="0 0 14 14" fill="none"
        style={{
          position: 'absolute',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-60deg) scale(0.4)',
          transition: 'opacity 0.22s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path d="M12 9.3A5.5 5.5 0 0 1 4.7 2a5.5 5.5 0 1 0 7.3 7.3Z" fill="currentColor" />
      </svg>
    </button>
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
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm7.43-2.06c.04-.3.07-.62.07-.94s-.03-.65-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.62l-1.92-3.32a.49.49 0 0 0-.6-.21l-2.39.96a6.97 6.97 0 0 0-1.62-.94l-.36-2.54A.49.49 0 0 0 14 3h-3.84a.49.49 0 0 0-.49.42l-.36 2.54a7.1 7.1 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.6.21L2.78 9.47a.48.48 0 0 0 .12.62l2.03 1.58c-.04.29-.07.63-.07.94s.03.65.07.94L2.9 15.13a.48.48 0 0 0-.12.62l1.92 3.32c.12.22.37.29.6.21l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.07.26.3.42.49.42H14c.26 0 .47-.18.49-.42l.36-2.54a7.1 7.1 0 0 0 1.62-.94l2.39.96c.23.08.48 0 .6-.21l1.92-3.32a.48.48 0 0 0-.12-.62l-2.03-1.58Z"/>
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
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <rect width="20" height="2" rx="1" fill="currentColor" />
              <rect y="6" width="14" height="2" rx="1" fill="currentColor" />
              <rect y="12" width="20" height="2" rx="1" fill="currentColor" />
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
