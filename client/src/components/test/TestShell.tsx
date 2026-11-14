import { CaretLeft } from '@phosphor-icons/react'
import ThemeToggle from '../ThemeToggle'

// The calm instrument frame shared by every cognitive test's intro / result
// screens. Flat field (never the page wash — a test needs a still background),
// a hairline top bar that defers to the content: a quiet back control, a
// sentence-case title (no tracked-out eyebrow), the theme toggle. The active
// play phase of each test renders its own bare full-screen field instead.
export default function TestShell({
  title,
  onBack,
  children,
  align = 'center',
}: {
  title: string
  onBack?: () => void
  children: React.ReactNode
  align?: 'center' | 'top'
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--white)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 20px', flexShrink: 0 }}>
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="test-back"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 38, height: 38, borderRadius: '50%',
              background: 'transparent', border: '0.5px solid var(--surface-border-2)',
              cursor: 'pointer', color: 'var(--w70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 160ms cubic-bezier(0.23,1,0.32,1), color 160ms, border-color 160ms, transform 120ms',
            }}
          >
            <CaretLeft size={17} weight="bold" />
          </button>
        )}
        <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em', color: 'var(--w60)' }}>
          {title}
        </p>
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
          <ThemeToggle />
        </div>
      </div>
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
          padding: '1rem 1.5rem 3rem',
        }}
      >
        {children}
      </div>
      <style>{`
        .test-back:hover { background: var(--surface-hover); color: var(--white); border-color: var(--line-2); }
        .test-back:active { transform: translateY(-50%) scale(0.92); }
      `}</style>
    </div>
  )
}
