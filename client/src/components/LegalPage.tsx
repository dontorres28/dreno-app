import { Link } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import { LEGAL } from '../legal/config';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Shared shell for every /legal/* page. Keeps typography, max width, back
 * link, and the "last updated" footer in one place.
 *
 * A [TODO: …] string from LEGAL renders in var(--red) so an unfilled field
 * is impossible to miss visually.
 */
export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="bg-wash" style={{ minHeight: '100dvh', color: 'var(--white)', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--w60)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', marginBottom: '2rem',
          }}
        >
          <CaretLeft size={16} weight="bold" />
          Back to Dreno
        </Link>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.25rem, 6vw, 3.25rem)',
          lineHeight: 1, letterSpacing: '-0.035em',
          marginBottom: '2rem',
        }}>
          {title}
        </h1>

        <div className="legal-body" style={{
          fontSize: 15, lineHeight: 1.7, color: 'var(--w80)',
          letterSpacing: '-0.005em',
        }}>
          {children}
        </div>

        <p style={{ marginTop: '3rem', fontSize: 13, color: 'var(--w60)' }}>
          Last updated: {LEGAL.lastUpdated}. Questions? <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--red)' }}>{LEGAL.contactEmail}</a>.
        </p>

        {/* Styles for markdown-ish content the pages render */}
        <style>{`
          .legal-body h2 { font-family: var(--font-display); font-size: 1.35rem; letter-spacing: -0.02em; margin: 2.5rem 0 0.75rem; color: var(--white); }
          .legal-body h3 { font-size: 1rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: var(--white); }
          .legal-body p  { margin: 0 0 1rem; }
          .legal-body ul { margin: 0 0 1rem 1.25rem; padding: 0; }
          .legal-body li { margin: 0.35rem 0; }
          .legal-body a  { color: var(--red); }
          .legal-body strong { color: var(--white); }
          /* Any [TODO: ...] token rendered inside a legal page pops in red */
          .legal-todo { color: var(--red); font-weight: 700; }
        `}</style>
      </div>
    </div>
  );
}

/** Render a value from LEGAL; highlight it red if it's still a TODO placeholder. */
export function L({ v }: { v: string }) {
  const isTodo = v.startsWith('[TODO');
  return <span className={isTodo ? 'legal-todo' : undefined}>{v}</span>;
}
