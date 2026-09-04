import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, Variants, useReducedMotion } from 'framer-motion';
import Layout from '../components/Layout';
import { AnimatedGroup } from '../components/AnimatedGroup';
import { Iphone15Pro } from '../components/Iphone15Pro';

// Dreno app screenshots served from /public
const DESKTOP_SHOT = '/dashboard-desktop.png';
const MOBILE_SHOT  = '/signup-mobile.png';

export default function Landing() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const stepsRef = useRef<HTMLDivElement>(null);
  const [stepsVisible, setStepsVisible] = useState(false);

  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setStepsVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const STEPS = [
    { n: '01', title: t('landing.step1Title'), body: t('landing.step1Body') },
    { n: '02', title: t('landing.step2Title'), body: t('landing.step2Body') },
    { n: '03', title: t('landing.step3Title'), body: t('landing.step3Body') },
    { n: '04', title: t('landing.step4Title'), body: t('landing.step4Body') },
  ];

  // §4 Behavior: critically damped spring, response ~0.4. §14 Reduced motion: opacity cross-fade only.
  const heroItem: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
      }
    : {
        hidden: { opacity: 0, filter: 'blur(8px)', y: 16 },
        visible: {
          opacity: 1, filter: 'blur(0px)', y: 0,
          transition: { type: 'spring', bounce: 0, duration: 0.5 },
        },
      };

  const mockupBase = { transition: { type: 'spring' as const, bounce: 0, duration: 0.5 } };
  const phoneEnter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay: 0.15 } }
    : { initial: { opacity: 0, x: -30, scale: 0.94 }, animate: { opacity: 1, x: 0, scale: 1 }, transition: { ...mockupBase.transition, delay: 0.35 } };
  const desktopEnter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, x: 30, scale: 0.98 }, animate: { opacity: 1, x: 0, scale: 1 }, transition: { ...mockupBase.transition, delay: 0.2 } };

  return (
    <Layout>

      <style>{`
        /* iPhone frame theme tokens — auto-adapt to dark/light */
        :root {
          --iphone-frame: #404040;
          --iphone-body: #262626;
          --iphone-screen-bg: #111;
          --iphone-safe-area: #000;
          --iphone-notch: #0a0a0a;
          --iphone-camera: #1a1a1a;
        }
        :root[data-theme="light"] {
          --iphone-frame: #DADADA;
          --iphone-body: #000;
          --iphone-screen-bg: #F5F5F5;
          --iphone-safe-area: #F7F5F1;
          --iphone-notch: #F0F0F0;
          --iphone-camera: #D1D1D1;
        }

        /* Step rows — editorial list, staggered enter */
        .step-row {
          opacity: 0;
          transform: translateY(14px);
          transition:
            opacity 600ms cubic-bezier(0.23, 1, 0.32, 1),
            transform 600ms cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform, opacity;
        }
        .step-row[data-visible="true"] { opacity: 1; transform: translateY(0); }
        .step-row:nth-child(1)[data-visible="true"] { transition-delay: 0ms; }
        .step-row:nth-child(2)[data-visible="true"] { transition-delay: 80ms; }
        .step-row:nth-child(3)[data-visible="true"] { transition-delay: 160ms; }
        .step-row:nth-child(4)[data-visible="true"] { transition-delay: 240ms; }
        .step-num {
          font-family: var(--font-display);
          letter-spacing: -0.04em;
          line-height: 0.92;
          color: var(--red);
          font-size: clamp(3rem, 9vw, 6.5rem);
          font-optical-sizing: auto;
        }

        /* Mobile — stack the phone above the desktop mockup so both remain readable */
        @media (max-width: 720px) {
          .mockup-row { flex-direction: column-reverse !important; gap: 1.5rem !important; }
          .mockup-row > div:first-child { width: min(680px, 90vw) !important; }
          .mockup-row > div:last-child { width: clamp(180px, 44vw, 240px) !important; }
        }

        /* §1 Response — CTAs respond on pointer-down, not release */
        .cta-btn {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition:
            transform 120ms cubic-bezier(0.23, 1, 0.32, 1),
            opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
            background 200ms cubic-bezier(0.23, 1, 0.32, 1),
            color 200ms cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform;
        }
        .cta-btn:active { transform: scale(0.97); transition-duration: 90ms; }
        @media (prefers-reduced-motion: reduce) {
          .step-row { transition: opacity 200ms ease; transform: none !important; }
          .step-row[data-visible="true"] { transform: none !important; }
          .cta-btn:active { transform: none !important; }
        }
      `}</style>

      {/* ── Hero — full-viewport radial + phone mockup ── */}
      <section
        style={{
          position: 'relative', width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Layered ambient gradient — soft warmth behind the H1, fully dissipated before the section edge */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: `
              radial-gradient(ellipse 65% 45% at 50% 32%, rgba(255,48,64,0.20) 0%, transparent 70%),
              radial-gradient(ellipse 110% 70% at 50% 15%, rgba(255,48,64,0.06) 0%, transparent 70%)
            `,
            /* Feather the bottom so the glow dissolves into var(--bg) before the section edge — kills the hard seam */
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 100%)',
            zIndex: 0,
          }}
        />

        {/* Hero copy */}
        <div style={{
          position: 'relative', zIndex: 10,
          maxWidth: 1120, margin: '0 auto',
          padding: 'clamp(3rem, 8vh, 5rem) 1.5rem clamp(1.5rem, 3vh, 2.5rem)',
          textAlign: 'center',
        }}>
          <AnimatedGroup
            className="max-w-4xl mx-auto text-center flex flex-col items-center"
            variants={{
              container: { visible: { transition: { staggerChildren: 0.1 } } },
              item: heroItem,
            }}
          >
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 9vw, 6.5rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.04em',
              marginBottom: '1.5rem',
              maxWidth: 900,
            }}>
              {t('landing.heroLine1')}<br />
              <span style={{ color: 'var(--red)' }}>{t('landing.heroLine2')}</span>
            </h1>

            <p style={{
              fontSize: 'clamp(15px, 1.6vw, 18px)',
              lineHeight: 1.55, letterSpacing: '-0.005em',
              color: 'var(--w70)',
              maxWidth: 560, margin: '0 auto 2.25rem',
            }}>
              {t('landing.heroSub')}
            </p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              justifyContent: 'center', marginBottom: '3rem',
            }}>
              <Link
                to="/signup"
                className="cta-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: 44, padding: '0 22px', borderRadius: 50,
                  fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-body)',
                  background: 'var(--red)', color: '#fff',
                  border: '0.5px solid var(--red)', textDecoration: 'none',
                  boxShadow: '0 10px 32px rgba(255,48,64,0.28)',
                }}
              >
                {t('landing.signUpFree')}
              </Link>
              <Link
                to="/login"
                className="cta-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 44, padding: '0 18px', borderRadius: 50,
                  fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em',
                  fontFamily: 'var(--font-body)',
                  background: 'transparent', color: 'var(--w80)',
                  border: '0.5px solid var(--surface-border-2)', textDecoration: 'none',
                }}
              >
                Sign in
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M3.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </AnimatedGroup>

          {/* Product mockup — phone left of desktop, pair centered */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 1200, margin: '0 auto', zIndex: 20 }}>
            <div className="mockup-row" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(1rem, 3vw, 2.5rem)',
            }}>
              {/* Phone — left */}
              <motion.div
                {...phoneEnter}
                style={{
                  flex: '0 0 auto',
                  width: 'clamp(180px, 22vw, 300px)',
                  filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.35))',
                }}
              >
                <Iphone15Pro src={MOBILE_SHOT} />
              </motion.div>

              {/* Desktop — right */}
              <motion.div
                {...desktopEnter}
                style={{
                  flex: '0 1 auto',
                  width: 'min(820px, 70vw)',
                  borderRadius: 12, overflow: 'hidden',
                  border: '0.5px solid var(--surface-border-2)',
                  boxShadow: '0 40px 120px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.35)',
                  background: 'var(--surface-1)',
                }}
              >
                <img
                  src={DESKTOP_SHOT}
                  alt="Dreno on desktop"
                  loading="lazy"
                  style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'cover' }}
                />
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── How it works — editorial rows, no boxes ── */}
      <section style={{ padding: 'clamp(2rem, 5vh, 3.5rem) 1.5rem clamp(4rem, 10vh, 8rem)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(2.5rem, 6vh, 4rem)' }}>
            <p className="label" style={{ margin: 0, marginBottom: 12 }}>How it works</p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 9vw, 6.5rem)',
              lineHeight: 0.92, letterSpacing: '-0.04em',
              maxWidth: 900,
            }}>
              From doubt<br />
              <span style={{ color: 'var(--red)' }}>to done.</span>
            </h2>
          </div>

          <div ref={stepsRef} style={{ display: 'flex', flexDirection: 'column' }}>
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="step-row"
                data-visible={stepsVisible}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'clamp(96px, 15%, 140px) 1fr',
                  gap: 'clamp(1rem, 3vw, 2rem)',
                  alignItems: 'baseline',
                  padding: 'clamp(1.5rem, 3vh, 2rem) 0',
                  borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border-2)',
                }}
              >
                <span className="step-num">{s.n}</span>
                <div style={{ minWidth: 0, paddingTop: 4 }}>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
                    letterSpacing: '-0.025em', lineHeight: 1.15,
                    marginBottom: '0.625rem',
                  }}>
                    {s.title}
                  </p>
                  <p style={{
                    fontSize: 'clamp(14px, 1.4vw, 16px)',
                    color: 'var(--w70)', letterSpacing: '-0.005em', lineHeight: 1.6,
                    maxWidth: 520,
                  }}>
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section style={{ padding: '2rem 1.5rem 7rem', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(700px, 90%)', height: 400,
            background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,48,64,0.14) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 9vw, 6.5rem)',
            lineHeight: 0.92, letterSpacing: '-0.04em',
            marginBottom: '1.25rem',
          }}>
            {t('landing.ctaLine1')}{' '}
            <span style={{ color: 'var(--red)' }}>{t('landing.ctaLine2')}</span>
          </h2>
          <p style={{
            fontSize: 15, color: 'var(--w70)', letterSpacing: '-0.005em',
            marginBottom: '2rem',
          }}>
            {t('landing.ctaSub')}
          </p>
          <Link
            to="/signup"
            className="cta-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 46, padding: '0 26px', borderRadius: 50,
              fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em',
              fontFamily: 'var(--font-body)',
              background: 'var(--red)', color: '#fff',
              border: '0.5px solid var(--red)', textDecoration: 'none',
            }}
          >
            {t('landing.getStarted')}
          </Link>
        </div>
      </section>

    </Layout>
  );
}
