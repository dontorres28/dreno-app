import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Cycle timing (seconds)
const T_INHALE1  = 4.0;   // bar rises
const T_INHALE2  = 0.5;   // small tick up
const T_HOLD     = 0.5;   // hold at top
const T_EXHALE   = 8.0;   // bar falls
const T_PAUSE    = 1.0;   // rest at bottom
const CYCLE_DUR  = T_INHALE1 + T_INHALE2 + T_HOLD + T_EXHALE + T_PAUSE; // 14s
const TOTAL_CYCLES = 3;
const TOTAL_DUR  = CYCLE_DUR * TOTAL_CYCLES; // 42s

const BAR_W  = 44;
const BAR_BONE = '#EBE4D2';
const BG     = '#0D1B2A';

// Easing helpers
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function easeOut(t: number)   { return 1 - (1 - t) ** 3; }

// Returns bar fill ratio [0,1] for a given time within a single cycle
function barRatio(t: number): number {
  if (t < T_INHALE1) {
    return easeInOut(t / T_INHALE1) * 0.80;
  }
  t -= T_INHALE1;
  if (t < T_INHALE2) {
    return 0.80 + easeOut(t / T_INHALE2) * 0.08;
  }
  t -= T_INHALE2;
  if (t < T_HOLD) {
    return 0.88;
  }
  t -= T_HOLD;
  if (t < T_EXHALE) {
    return 0.88 * (1 - easeInOut(t / T_EXHALE));
  }
  return 0;
}

// Phase label shown at bottom (very subtle)
function phaseLabel(t: number): string {
  if (t < T_INHALE1) return 'inhale';
  if (t < T_INHALE1 + T_INHALE2) return 'inhale';
  if (t < T_INHALE1 + T_INHALE2 + T_HOLD) return '';
  if (t < T_INHALE1 + T_INHALE2 + T_HOLD + T_EXHALE) return 'exhale';
  return '';
}

type Screen = 'intro' | 'running' | 'done';

export default function DrillSigh() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('intro');
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdElapsedRef = useRef<number>(0);

  // Canvas draw loop
  useEffect(() => {
    if (screen !== 'running') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    startRef.current = performance.now();

    function draw(now: number) {
      const ctx = canvas!.getContext('2d') as CanvasRenderingContext2D;
      const elapsed = (now - startRef.current) / 1000; // seconds
      const clamped  = Math.min(elapsed, TOTAL_DUR);
      const cycleIdx = Math.min(Math.floor(clamped / CYCLE_DUR), TOTAL_CYCLES - 1);
      const tInCycle = clamped - cycleIdx * CYCLE_DUR;

      const ratio = barRatio(tInCycle);
      const label = phaseLabel(tInCycle);

      const W = canvas!.width;
      const H = canvas!.height;
      const maxBarH = H * 0.55;
      const barH = ratio * maxBarH;
      const barX = (W - BAR_W) / 2;
      const barY = H * 0.62 - barH;      // bottom-anchored at 62% down

      // Background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Glow (soft diffuse behind bar)
      if (ratio > 0.01) {
        const grd = ctx.createRadialGradient(W/2, H*0.62, 0, W/2, H*0.62, maxBarH * 0.7);
        grd.addColorStop(0,   `rgba(235,228,210,${0.06 * ratio})`);
        grd.addColorStop(1,   'rgba(235,228,210,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      // Bar track (faint)
      ctx.fillStyle = 'rgba(235,228,210,0.06)';
      ctx.beginPath();
      ctx.roundRect(barX, H*0.62 - maxBarH, BAR_W, maxBarH, 4);
      ctx.fill();

      // Bar fill
      if (barH > 1) {
        ctx.fillStyle = BAR_BONE;
        ctx.globalAlpha = 0.82 + ratio * 0.18;
        ctx.beginPath();
        ctx.roundRect(barX, barY, BAR_W, barH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Phase label — bottom center, very quiet
      if (label) {
        ctx.fillStyle = `rgba(235,228,210,${0.18 + ratio * 0.08})`;
        ctx.font = '11px var(--font-body, system-ui)';
        ctx.letterSpacing = '0.12em';
        ctx.textAlign = 'center';
        ctx.fillText(label.toUpperCase(), W/2, H * 0.62 + 36);
      }

      // Cycle dots
      const dotY = H * 0.85;
      const dotSpacing = 14;
      const dotsStart = W/2 - (TOTAL_CYCLES - 1) * dotSpacing / 2;
      for (let i = 0; i < TOTAL_CYCLES; i++) {
        const done = i < cycleIdx || (i === cycleIdx && tInCycle >= CYCLE_DUR - T_PAUSE);
        ctx.fillStyle = done ? 'rgba(235,228,210,0.6)' : i === cycleIdx ? 'rgba(235,228,210,0.25)' : 'rgba(235,228,210,0.1)';
        ctx.beginPath();
        ctx.arc(dotsStart + i * dotSpacing, dotY, 3, 0, Math.PI*2);
        ctx.fill();
      }

      if (elapsed < TOTAL_DUR) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        // All 3 cycles complete
        cancelAnimationFrame(rafRef.current);
        complete();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [screen]);

  async function complete() {
    setSaving(true);
    setScreen('done');
    try {
      if (!user) return;
      await supabase.from('drill_results').insert({
        athlete_id: user.id,
        drill_type: 'the_sigh',
        composite_score: 3,
        raw_score: TOTAL_CYCLES,
        completed_at: new Date().toISOString(),
      });
    } catch { /* non-blocking */ }
    finally { setSaving(false); }
  }

  // Hold-to-exit anywhere on canvas
  function onPointerDown() {
    holdStartRef.current = performance.now();
    holdRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      navigate('/drills');
    }, 1000);
  }
  function onPointerUp() {
    if (holdRef.current) clearTimeout(holdRef.current);
  }

  // ── Intro screen ───────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', color: BAR_BONE,
        padding: '2rem', textAlign: 'center',
      }}>
        <button
          onClick={() => navigate('/drills')}
          style={{
            position: 'absolute', top: 20, left: 20,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(235,228,210,0.45)', display: 'flex', alignItems: 'center',
            gap: 6, fontSize: 14, fontWeight: 500, padding: '8px', fontFamily: 'var(--font-body)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.35)', marginBottom: '1.5rem' }}>
          {t('drillSigh.title')}
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 10vw, 4rem)',
          lineHeight: 0.95, letterSpacing: '-0.03em',
          marginBottom: '2rem', color: BAR_BONE,
        }}>
          Three cycles.<br />42 seconds.
        </h1>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3.5rem', alignItems: 'flex-end' }}>
          {[
            { secs: '4s', label: 'inhale' },
            { secs: '+', label: 'top up' },
            { secs: '8s', label: 'exhale' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: s.secs === '+' ? '2rem' : '2.8rem',
                lineHeight: 1, letterSpacing: '-0.04em',
                color: BAR_BONE, marginBottom: 8,
              }}>{s.secs}</p>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'rgba(235,228,210,0.25)', marginBottom: '2rem' }}>
          Breathe with the bar. Hold anywhere to exit.
        </p>

        <button
          onClick={() => setScreen('running')}
          style={{
            background: BAR_BONE, color: BG,
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            padding: '14px 40px', borderRadius: 50, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          Begin
        </button>

      </div>
    );
  }

  // ── Running screen ─────────────────────────────────────────────
  if (screen === 'running') {
    return (
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'none', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    );
  }

  // ── Done screen ────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', color: BAR_BONE,
      textAlign: 'center', padding: '2rem',
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.3)', marginBottom: '1.5rem' }}>
        Breathing reset
      </p>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(4rem, 14vw, 7rem)',
        lineHeight: 0.9, letterSpacing: '-0.04em',
        color: BAR_BONE, marginBottom: '0.25rem',
      }}>
        {TOTAL_CYCLES}
      </p>
      <p style={{ fontSize: 14, color: 'rgba(235,228,210,0.4)', marginBottom: '3rem' }}>
        cycles complete
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setScreen('running')}
          style={{
            background: BAR_BONE, color: BG,
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            padding: '14px 36px', borderRadius: 50, border: 'none', cursor: 'pointer',
          }}
        >
          Again
        </button>
        <button
          onClick={() => navigate('/drills')}
          disabled={saving}
          style={{
            background: 'none', border: '0.5px solid rgba(235,228,210,0.2)',
            color: 'rgba(235,228,210,0.5)', fontFamily: 'var(--font-body)',
            fontSize: 14, padding: '14px 28px', borderRadius: 50, cursor: 'pointer',
            opacity: saving ? 0.4 : 1,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
