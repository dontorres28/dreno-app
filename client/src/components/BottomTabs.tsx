import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { navItemsFor, isItemActive } from './navConfig';

// iOS-style bottom tab bar. Mobile only (desktop uses the top bar). Thumb-
// reachable, safe-area aware, blurred material. Hidden when signed out.
// Portaled to <body> so position:fixed resolves against the viewport, not the
// route-transition wrapper (which keeps a transform and would trap it).
export default function BottomTabs() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const location = useLocation();

  if (!user) return null;
  const items = navItemsFor(profile?.role, t);

  return createPortal(
    <nav
      className="flex md:hidden"
      aria-label="Primary"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100,
        background: 'var(--nav-bg)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '0.5px solid var(--nav-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map(item => {
        const active = isItemActive(item, location.pathname);
        const { Icon } = item;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '9px 4px 7px',
              textDecoration: 'none',
              color: active ? 'var(--accent-strong)' : 'var(--w60)',
              transition: 'color 200ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            <Icon size={23} weight={active ? 'fill' : 'regular'} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, letterSpacing: '0.01em', lineHeight: 1 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>,
    document.body,
  );
}
