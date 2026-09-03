import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, LayoutGroup } from 'framer-motion';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Tooltip from './Tooltip';
import LanguagePicker from './LanguagePicker';


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
    { label: 'Roster', to: '/coach/athletes' },
    { label: t('nav.messages'), to: '/messages' },
    { label: t('nav.profile'), to: '/coach/profile/edit' },
  ];

  const adminLinks = [
    { label: 'Dashboard', to: '/admin-dashboard' },
    { label: 'Athletes', to: '/admin/athletes' },
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
              <LayoutGroup id="nav">
                {links.map(l => {
                  const active = isActive(l.to);
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      style={{
                        position: 'relative',
                        fontSize: 14,
                        fontWeight: active ? 700 : 500,
                        padding: '7px 14px',
                        borderRadius: 50,
                        color: active ? 'var(--nav-active-color)' : 'var(--w70)',
                        transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                        textDecoration: 'none',
                      }}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill"
                          initial={false}
                          transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'var(--nav-active-bg)',
                            borderRadius: 50,
                            zIndex: 0,
                          }}
                        />
                      )}
                      <span style={{ position: 'relative', zIndex: 1 }}>{l.label}</span>
                    </Link>
                  );
                })}
              </LayoutGroup>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <ThemeToggle />
              <Tooltip label="Settings"><Link
                to={isAdmin ? '/admin/settings' : '/settings'}
                className="settings-link"
                style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--nav-active-color)',
                  background: 'var(--nav-active-bg)',
                  border: 'none',
                  flexShrink: 0,
                  transition: 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
                </svg>
              </Link></Tooltip>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LanguagePicker />
                <ThemeToggle />
              </div>
              <Link
                to="/login"
                style={{
                  fontSize: 14, fontWeight: 500, padding: '7px 14px',
                  color: 'var(--w70)', borderRadius: 50,
                  letterSpacing: '-0.005em', marginLeft: 8, textDecoration: 'none',
                  transition: 'color 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--w70)')}
              >
                {t('nav.signIn')}
              </Link>
              <Link
                to="/signup"
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: 14, marginLeft: 4, letterSpacing: '-0.005em' }}
              >
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
              <Link to="/login" onClick={() => setOpen(false)} style={{ fontSize: 16, fontWeight: 500, padding: '12px 0', color: 'var(--w60)' }}>Sign in</Link>
              <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary" style={{ marginTop: 12, textAlign: 'center' }}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
