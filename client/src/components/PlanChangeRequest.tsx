import { useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import Spinner from './Spinner';
import toast from 'react-hot-toast';

interface Tier {
  key: string;
  label: string;
  price: number;
  desc: string;
}

const TIERS: Tier[] = [
  { key: 'small',  label: 'Small',  price: 500,  desc: 'Up to 30 athletes'  },
  { key: 'medium', label: 'Medium', price: 1200, desc: 'Up to 100 athletes' },
  { key: 'large',  label: 'Large',  price: 2500, desc: '100+ athletes'      },
];

interface Props {
  currentTier: string;
  orgName?: string;
  contactEmail?: string;
  onClose: () => void;
}

export default function PlanChangeRequest({ currentTier, orgName, contactEmail, onClose }: Props) {
  const [targetTier, setTargetTier] = useState<string>(currentTier === 'large' ? 'small' : currentTier === 'medium' ? 'large' : 'medium');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (sending) return;
    setSending(true);

    const tier = TIERS.find(t => t.key === targetTier);
    const subject = `Plan change request${orgName ? ` — ${orgName}` : ''}`;
    const body = [
      `Organization: ${orgName ?? '(unnamed)'}`,
      `Current plan: ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}`,
      `Requested plan: ${tier?.label ?? targetTier} · ${tier?.desc ?? ''}`,
      `Billing: ${billing === 'annual' ? 'Annual (15% off)' : 'Monthly'}`,
      '',
      note.trim() ? `Note:\n${note.trim()}` : '',
    ].filter(Boolean).join('\n');

    try {
      const mailto = `mailto:hello@dreno.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      toast.success('Opening your email…');
      setTimeout(onClose, 400);
    } catch {
      toast.error('Could not open your email client');
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="plan-scrim"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        animation: 'planFadeIn 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        overflow: 'auto',
      }}
    >
      <style>{`
        @keyframes planFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes planRise { from { transform: translateY(12px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .plan-scrim { background: rgba(0,0,0,0.55); }
        :root[data-theme="light"] .plan-scrim,
        :root:not([data-theme="dark"]) .plan-scrim { background: rgba(30,24,16,0.28); }
        @media (prefers-color-scheme: light) {
          :root:not([data-theme]) .plan-scrim { background: rgba(30,24,16,0.28); }
        }
      `}</style>

      <div style={{
        background: 'var(--bg)',
        border: '0.5px solid var(--surface-border-2)',
        borderRadius: 24, padding: '1.5rem',
        width: '100%', maxWidth: 460,
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
        animation: 'planRise 260ms cubic-bezier(0.23, 1, 0.32, 1)',
        maxHeight: 'calc(100dvh - 2.5rem)', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.32)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p className="label" style={{ margin: 0, marginBottom: 6 }}>Plan change</p>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
              letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 6,
            }}>
              Request an upgrade
            </h2>
            <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em', lineHeight: 1.5 }}>
              Pick the plan you want, add a note if you like, and our team will confirm within one business day.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
              background: 'transparent', border: '0.5px solid var(--surface-border-2)',
              color: 'var(--w70)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Current vs target */}
        <div>
          <p className="label" style={{ margin: 0, marginBottom: 8 }}>New plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIERS.map(t => {
              const on = targetTier === t.key;
              const isCurrent = t.key === currentTier;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTargetTier(t.key)}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 16,
                    cursor: 'pointer', textAlign: 'left',
                    background: on ? 'var(--red)' : 'transparent',
                    border: on ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                    fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
                    transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: on ? '#fff' : 'transparent',
                    border: on ? 'none' : '1.5px solid var(--surface-border-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{
                        fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em',
                        color: on ? '#fff' : 'var(--white)',
                      }}>
                        {t.label}
                      </p>
                      {isCurrent && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: 50,
                          background: on ? 'rgba(255,255,255,0.2)' : 'var(--surface-2)',
                          color: on ? '#fff' : 'var(--w70)',
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 12,
                      color: on ? 'rgba(255,255,255,0.85)' : 'var(--w60)',
                      letterSpacing: '-0.005em',
                    }}>
                      {t.desc}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                      letterSpacing: '-0.03em', lineHeight: 1,
                      color: on ? '#fff' : 'var(--white)',
                    }}>
                      ${t.price.toLocaleString()}
                    </p>
                    <p style={{
                      fontSize: 10, marginTop: 3,
                      color: on ? 'rgba(255,255,255,0.75)' : 'var(--w60)',
                    }}>
                      /mo
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Billing toggle — sliding red pill */}
        <div>
          <p className="label" style={{ margin: 0, marginBottom: 8 }}>Billing</p>
          <div style={{ display: 'flex', gap: 4 }}>
            <LayoutGroup id="plan-billing">
              {[
                { key: 'monthly' as const, label: 'Monthly' },
                { key: 'annual' as const,  label: 'Annual · 15% off' },
              ].map(b => {
                const on = billing === b.key;
                return (
                  <button
                    key={b.key}
                    onClick={() => setBilling(b.key)}
                    style={{
                      position: 'relative', flex: 1,
                      padding: '10px 0', borderRadius: 50, fontSize: 13,
                      fontWeight: on ? 700 : 500, letterSpacing: '-0.005em',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: on ? '#fff' : 'var(--w70)',
                      fontFamily: 'var(--font-body)',
                      transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    {on && (
                      <motion.span
                        layoutId="plan-billing-pill"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                        style={{ position: 'absolute', inset: 0, background: 'var(--red)', borderRadius: 50, zIndex: 0 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{b.label}</span>
                  </button>
                );
              })}
            </LayoutGroup>
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="label" style={{ margin: 0, marginBottom: 8 }}>Note <span style={{ color: 'var(--w60)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Anything you'd like us to know? Timing, custom needs, questions…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--surface-2)',
              border: '0.5px solid var(--surface-border-2)',
              borderRadius: 14, padding: '12px 14px',
              fontSize: 15, lineHeight: 1.5, letterSpacing: '-0.005em',
              color: 'var(--white)', fontFamily: 'var(--font-body)',
              resize: 'vertical', minHeight: 80, outline: 'none',
            }}
          />
        </div>

        {/* Recipient hint */}
        <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em', textAlign: 'center', lineHeight: 1.5 }}>
          Sent to <span style={{ color: 'var(--w70)', fontWeight: 600 }}>hello@dreno.app</span>
          {contactEmail ? <> · we'll reply to <span style={{ color: 'var(--w70)', fontWeight: 600 }}>{contactEmail}</span></> : null}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              flex: 1, height: 46, borderRadius: 50,
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em',
              fontFamily: 'var(--font-body)',
              background: 'transparent',
              border: '0.5px solid var(--surface-border-2)',
              color: 'var(--w70)',
              cursor: sending ? 'not-allowed' : 'pointer',
              transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={sending || targetTier === currentTier && billing === 'monthly'}
            style={{
              flex: 1, height: 46, borderRadius: 50,
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em',
              fontFamily: 'var(--font-body)',
              background: 'var(--red)', border: '0.5px solid var(--red)', color: '#fff',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            {sending ? <Spinner size={16} /> : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}
