import { useEffect, useRef, useState } from 'react';
import { LANGUAGE_CODES, setLanguageFromPreference } from '../i18n';

const LANGUAGES = Object.keys(LANGUAGE_CODES);

export default function LanguagePicker() {
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
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
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
        aria-haspopup="listbox"
        aria-expanded={open}
        className="lang-pill"
        style={{
          height: 32, padding: '0 12px 0 14px', borderRadius: 50,
          background: open ? 'var(--surface-2)' : 'transparent',
          border: '0.5px solid var(--surface-border-2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, gap: 6,
          cursor: 'pointer', color: 'var(--w70)', flexShrink: 0,
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
          letterSpacing: '-0.005em',
          transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms, border-color 200ms',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {current}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{
            display: 'block', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          aria-hidden
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <style>{`
          .lang-pill:hover { background: var(--surface-2); color: var(--white); }
          .lang-pill:active { transform: scale(0.96); transition: transform 90ms cubic-bezier(0.4, 0, 1, 1); }
          @media (prefers-reduced-motion: reduce) { .lang-pill:active { transform: none; } }
        `}</style>
      </button>
      {open && (
        <div
          role="listbox"
          className="lang-menu"
          style={{
            position: 'absolute', top: 42, right: 0, zIndex: 200,
            background: 'var(--bg)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 16, padding: 6, minWidth: 180,
            boxShadow: '0 20px 48px rgba(0,0,0,0.32)',
            maxHeight: 320, overflowY: 'auto',
            transformOrigin: 'top right',
            animation: 'langMenuRise 200ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <style>{`
            @keyframes langMenuRise {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .lang-item:hover { background: var(--surface-2); }
          `}</style>
          {LANGUAGES.map(lang => {
            const isCurrent = lang === current;
            return (
              <button
                key={lang}
                onClick={() => select(lang)}
                role="option"
                aria-selected={isCurrent}
                className="lang-item"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  width: '100%', padding: '9px 12px',
                  background: 'none', border: 'none', borderRadius: 10,
                  fontSize: 14, letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-body)', cursor: 'pointer', textAlign: 'left',
                  color: isCurrent ? 'var(--white)' : 'var(--w70)',
                  fontWeight: isCurrent ? 700 : 500,
                  transition: 'background 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <span>{lang}</span>
                {isCurrent && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--red)', flexShrink: 0 }} aria-hidden>
                    <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
