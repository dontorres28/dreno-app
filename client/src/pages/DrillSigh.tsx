import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

// Simple 3-phase cycle: breathe in (4s) → hold (1s) → breathe out (8s). 3 rounds.
const T_IN   = 4.0;
const T_HOLD = 1.0;
const T_OUT  = 8.0;
const CYCLE  = T_IN + T_HOLD + T_OUT;
const ROUNDS = 3;
const TOTAL  = CYCLE * ROUNDS;

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

// scale [0.18 (tiny) → 1.0 (huge)]
function scaleAt(t: number): number {
  const MIN = 0.18, MAX = 1.0, R = MAX - MIN;
  if (t < T_IN) return MIN + easeInOut(t / T_IN) * R;
  t -= T_IN;
  if (t < T_HOLD) return MAX;
  t -= T_HOLD;
  if (t < T_OUT) return MIN + (1 - easeInOut(t / T_OUT)) * R;
  return MIN;
}

type Phase = 'in' | 'hold' | 'out';
function phaseAt(t: number): Phase {
  if (t < T_IN) return 'in';
  if (t < T_IN + T_HOLD) return 'hold';
  return 'out';
}

type Screen = 'intro' | 'running' | 'done';

const Shell = ({ children, title, onBack }: { children: React.ReactNode; title: string; onBack?: () => void }) => (
  <div style={{
    minHeight: '100dvh', background: 'var(--bg)', color: 'var(--white)',
    fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column',
    WebkitFontSmoothing: 'antialiased',
  }}>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', flexShrink: 0 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w70)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      )}
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>
        {title}
      </p>
      <div style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)' }}>
        <ThemeToggle />
      </div>
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 1.5rem 3rem' }}>
      {children}
    </div>
  </div>
);

export default function DrillSigh() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('intro');
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(0.18);
  const [phase, setPhase] = useState<Phase>('in');
  const [round, setRound] = useState(1);
  const [countdown, setCountdown] = useState(4);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (screen !== 'running') return;
    startRef.current = performance.now();
    savedRef.current = false;

    function tick(now: number) {
      const elapsed = (now - startRef.current) / 1000;
      const t = Math.min(elapsed, TOTAL);
      const rIdx = Math.min(Math.floor(t / CYCLE), ROUNDS - 1);
      const tInCycle = t - rIdx * CYCLE;
      const p = phaseAt(tInCycle);
      const s = scaleAt(tInCycle);

      let cd = 0;
      if (p === 'in') cd = Math.ceil(T_IN - tInCycle);
      else if (p === 'hold') cd = Math.ceil(T_IN + T_HOLD - tInCycle);
      else cd = Math.ceil(CYCLE - tInCycle);

      setScale(s);
      setPhase(p);
      setRound(rIdx + 1);
      setCountdown(cd);

      if (elapsed < TOTAL) rafRef.current = requestAnimationFrame(tick);
      else complete();
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen]);

  async function complete() {
    if (savedRef.current) return;
    savedRef.current = true;
    setSaving(true);
    setScreen('done');
    try {
      if (!user) return;
      await supabase.from('drill_results').insert({
        athlete_id: user.id,
        drill_type: 'the_sigh',
        composite_score: 3,
        raw_score: ROUNDS,
        completed_at: new Date().toISOString(),
      });
    } catch { /* non-blocking */ }
    finally { setSaving(false); }
  }

  function onPointerDown() {
    holdRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      navigate('/drills');
    }, 900);
  }
  function onPointerUp() {
    if (holdRef.current) clearTimeout(holdRef.current);
  }

  const bigInstruction =
    phase === 'in' ? 'Breathe in' :
    phase === 'hold' ? 'Hold' :
    'Breathe out';

  // ── Intro ──────────────────────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <Shell title="Breathe" onBack={() => navigate('/drills')}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 8vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
            Breathe with the circle
          </h1>
          <p style={{ fontSize: 17, color: 'var(--w70)', lineHeight: 1.5, marginBottom: '2.5rem', maxWidth: 380, margin: '0 auto 2.5rem' }}>
            When it gets bigger, breathe in. When it gets smaller, breathe out.
          </p>

          {/* Live demo circle */}
          <div style={{
            width: 200, height: 200, margin: '0 auto 2.5rem',
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute', width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,48,64,0.35) 0%, rgba(255,48,64,0.08) 45%, transparent 70%)',
              animation: 'sighDemoGlow 6s ease-in-out infinite',
            }} />
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #ff5566 0%, #FF3040 55%, #cc1e2c 100%)',
              boxShadow: '0 0 40px rgba(255,48,64,0.35)',
              animation: 'sighDemo 6s ease-in-out infinite',
            }} />
          </div>

          <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '2rem', letterSpacing: '0.02em' }}>
            3 rounds. About 40 seconds.
          </p>

          <button
            className="btn-primary"
            style={{ fontSize: 16, height: 52, padding: '0 44px' }}
            onClick={() => setScreen('running')}
          >
            Start
          </button>

          <style>{`
            @keyframes sighDemo {
              0%, 100% { transform: scale(0.35); }
              45%, 55% { transform: scale(1); }
            }
            @keyframes sighDemoGlow {
              0%, 100% { transform: scale(0.35); opacity: 0.4; }
              45%, 55% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      </Shell>
    );
  }

  // ── Running — big obvious circle ──────────────────────────────────────
  if (screen === 'running') {
    return (
      <div
        style={{
          minHeight: '100dvh', background: 'var(--bg)', color: 'var(--white)',
          fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
          position: 'relative', overflow: 'hidden',
          padding: '3rem 1.5rem 2rem',
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Ambient red bloom that grows with the circle */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(60% 60% at 50% 50%, rgba(255,48,64,${0.08 + scale * 0.20}), transparent 75%)`,
        }} />

        {/* Top: big instruction text */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            lineHeight: 1, letterSpacing: '-0.035em',
            color: 'var(--white)',
            marginBottom: 8,
          }}>
            {bigInstruction}
          </p>
          <p style={{
            fontSize: 14, fontWeight: 500, color: 'var(--w60)',
            letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums',
          }}>
            Round {round} of {ROUNDS}
          </p>
        </div>

        {/* Center: the breathing circle */}
        <div style={{
          position: 'relative',
          width: 'min(70vw, 380px)', height: 'min(70vw, 380px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Outer glow */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,48,64,0.35) 0%, rgba(255,48,64,0.05) 50%, transparent 70%)',
            transform: `scale(${scale * 1.15})`,
            transition: `transform 80ms linear`,
            filter: 'blur(8px)',
            willChange: 'transform',
          }} />

          {/* Main red orb */}
          <div style={{
            position: 'absolute',
            width: '80%', height: '80%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 28%, #ff667a 0%, #FF3040 50%, #c81f2b 100%)',
            boxShadow: '0 0 50px rgba(255,48,64,0.4), inset 0 0 60px rgba(0,0,0,0.12)',
            transform: `scale(${scale})`,
            transition: `transform 80ms linear`,
            willChange: 'transform',
          }} />

          {/* Countdown number, centered, doesn't scale */}
          <p style={{
            position: 'relative', zIndex: 2,
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(4rem, 12vw, 7rem)',
            lineHeight: 1, letterSpacing: '-0.045em',
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
            textShadow: '0 2px 20px rgba(0,0,0,0.25)',
          }}>
            {countdown}
          </p>
        </div>

        {/* Bottom: round dots + exit hint */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <span key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < round - 1 ? 'var(--red)' : i === round - 1 ? 'var(--w60)' : 'var(--w20)',
                transition: `background 500ms ${EASE}`,
              }} />
            ))}
          </div>
          <p style={{
            fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--w40)', fontWeight: 600,
          }}>
            Hold anywhere to exit
          </p>
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────
  return (
    <Shell title="Breathe">
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 2rem',
          background: 'radial-gradient(circle at 35% 30%, #ff5566 0%, #FF3040 55%, #cc1e2c 100%)',
          boxShadow: '0 0 40px rgba(255,48,64,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            <path d="M12 22l6 6L30 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 3.75rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '0.75rem' }}>
          Nice work
        </h1>
        <p style={{ fontSize: 16, color: 'var(--w70)', marginBottom: '2.5rem', lineHeight: 1.5, maxWidth: 340, margin: '0 auto 2.5rem' }}>
          You just calmed your nervous system.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('/drills')} disabled={saving}>
            Done
          </button>
          <button className="btn-primary" onClick={() => { savedRef.current = false; setScreen('running'); }}>
            Again
          </button>
        </div>
      </div>
    </Shell>
  );
}
