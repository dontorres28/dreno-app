import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, LayoutGroup } from 'framer-motion';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import LanguagePicker from './LanguagePicker';
import { navItemsFor, isItemActive } from './navConfig';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const location = useLocation();

  const isAdmin = profile?.role === 'administrator';
  const isCoach = profile?.role === 'coach';
  const items = user ? navItemsFor(profile?.role, t) : [];
  const home = user ? (isAdmin ? '/admin-dashboard' : isCoach ? '/coach-dashboard' : '/dashboard') : '/';

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 100, height: 60,
        display: 'flex', alignItems: 'center', padding: '0 clamp(1.25rem, 4vw, 2rem)',
        background: 'var(--nav-bg)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '0.5px solid var(--nav-border)',
      }}
    >
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={home}><Logo size="sm" /></Link>

        {user ? (
          <>
            {/* Desktop: consolidated pills + theme toggle. Mobile: just the toggle (bottom tabs own nav). */}
            <div className="hidden md:flex items-center gap-1">
              <LayoutGroup id="nav">
                {items.map(l => {
                  const active = isItemActive(l, location.pathname);
                  return (
                    <Link key={l.to} to={l.to} style={{
                      position: 'relative', fontSize: 14, fontWeight: active ? 700 : 500,
                      padding: '7px 14px', borderRadius: 50,
                      color: active ? 'var(--nav-active-color)' : 'var(--w70)',
                      transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)', textDecoration: 'none',
                    }}>
                      {active && (
                        <motion.span layoutId="nav-active-pill" initial={false}
                          transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                          style={{ position: 'absolute', inset: 0, background: 'var(--nav-active-bg)', borderRadius: 50, zIndex: 0 }} />
                      )}
                      <span style={{ position: 'relative', zIndex: 1 }}>{l.label}</span>
                    </Link>
                  );
                })}
                <div style={{ marginLeft: 8 }}><ThemeToggle /></div>
              </LayoutGroup>
            </div>
            <div className="md:hidden"><ThemeToggle /></div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <ThemeToggle />
            <Link to="/login" className="hidden min-[400px]:inline-flex" style={{ fontSize: 14, fontWeight: 500, padding: '7px 10px', color: 'var(--w70)', textDecoration: 'none' }}>
              {t('nav.signIn')}
            </Link>
            <Link to="/signup" className="btn-primary" style={{ padding: '8px 18px', fontSize: 14, letterSpacing: '-0.005em' }}>
              {t('nav.getStarted')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
