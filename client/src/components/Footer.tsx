import { Link } from 'react-router-dom';
import { LEGAL } from '../legal/config';

/**
 * Minimal footer with legal links + business details. Rendered under the
 * landing hero (and anywhere else that wants it).
 */
export default function Footer() {
  return (
    <footer style={{
      borderTop: '0.5px solid var(--surface-border-2)',
      padding: '2.5rem 1.5rem 3rem',
      color: 'var(--w60)',
      fontSize: 13, letterSpacing: '-0.005em',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '1.5rem 2.5rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 220 }}>
          <p style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: 16, color: 'var(--white)', marginBottom: 6 }}>
            DRENO<span style={{ color: 'var(--red)' }}>/</span>
          </p>
          <p>{LEGAL.companyName}</p>
          <p>{LEGAL.companyAddress}</p>
          <p>{LEGAL.registryInfo}</p>
          <p><a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--w70)' }}>{LEGAL.contactEmail}</a></p>
        </div>

        <nav aria-label="Legal" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/legal/terms"    style={{ color: 'var(--w70)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/legal/privacy"  style={{ color: 'var(--w70)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/legal/cookies"  style={{ color: 'var(--w70)', textDecoration: 'none' }}>Cookie Policy</Link>
          <Link to="/legal/refunds"  style={{ color: 'var(--w70)', textDecoration: 'none' }}>Refunds &amp; Cancellations</Link>
        </nav>
      </div>
    </footer>
  );
}
