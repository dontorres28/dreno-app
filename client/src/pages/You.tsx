import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Target, NotePencil, BookOpen, Gear, SignOut, CaretRight } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

// Athlete "You" hub, the 5th tab. Homes the personal destinations that came
// off the main nav when it was consolidated to 5.
export default function You() {
  const { t } = useTranslation();
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const name = profile?.name?.trim() || 'Athlete';
  const initial = (name[0] || 'A').toUpperCase();

  const rows = [
    { to: '/goals', label: t('nav.goals'), Icon: Target },
    { to: '/journal', label: t('nav.journal'), Icon: NotePencil },
    { to: '/playbook', label: 'Playbook', Icon: BookOpen },
    { to: '/settings', label: 'Settings', Icon: Gear },
  ];

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem 3rem' }}>
        {/* Identity header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'clamp(2rem, 5vh, 2.75rem)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 22, flexShrink: 0,
            background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--w80)', fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.02em',
          }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', letterSpacing: '-0.035em', lineHeight: 1 }}>
              {name}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--w60)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Destination rows */}
        <div className="squircle" style={{
          background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
          borderRadius: 22, overflow: 'hidden', marginBottom: 20,
        }}>
          {rows.map((r, i) => (
            <Link key={r.to} to={r.to} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              textDecoration: 'none', color: 'var(--white)',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
            }}>
              <r.Icon size={21} weight="duotone" color="var(--accent)" />
              <span style={{ flex: 1, fontSize: 15.5, fontWeight: 500 }}>{r.label}</span>
              <CaretRight size={16} weight="bold" color="var(--w40)" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} className="squircle" style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '15px', borderRadius: 18, cursor: 'pointer',
          background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
          color: 'var(--w70)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600,
        }}>
          <SignOut size={18} weight="bold" />
          {t('settings.signOut')}
        </button>
      </div>
    </Layout>
  );
}
