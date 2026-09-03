import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Pattern = 'horizontal' | 'cross' | 'random' | 'dual' | 'rapid';
type Phase = 'select' | 'session' | 'done';

interface Pos { nx: number; ny: number }
interface LevelDef {
  n: number;
  name: string;
  desc: string;
  pattern: Pattern;
  totalDuration: number;
  holdMs: number;
  dotCount: number;
  blinkChance?: number;
  blinkMs?: number;
}

const LEVELS: LevelDef[] = [
  { n: 1, name: 'Saccade',  desc: 'Snap left to right. No tracking, just snap.', pattern: 'horizontal', totalDuration: 45, holdMs: 700,  dotCount: 1 },
  { n: 2, name: 'Cross',    desc: 'Four directions. Full range of motion.',         pattern: 'cross',      totalDuration: 60, holdMs: 520,  dotCount: 1 },
  { n: 3, name: 'Random',   desc: 'Unpredictable positions anywhere on screen.',    pattern: 'random',     totalDuration: 75, holdMs: 400,  dotCount: 1 },
  { n: 4, name: 'Split',    desc: 'Two dots moving independently. Track both.',     pattern: 'dual',       totalDuration: 90, holdMs: 480,  dotCount: 2 },
  { n: 5, name: 'Rapid',    desc: 'Fast random. Some positions blink and vanish.',  pattern: 'rapid',      totalDuration: 90, holdMs: 260,  dotCount: 1, blinkChance: 0.3, blinkMs: 110 },
];

const UNLOCK_AT = 5;
const DOT_R = 14;
const MARGIN = 0.12;
const BG   = '#0D1B2A';
const BONE = '#EBE4D2';
const RED  = '#FF3040';

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function getPositions(pattern: Pattern, count: number, seed: number): Pos[][] {
  const rand = lcg(seed);
  const frames: Pos[][] = [];
  if (pattern === 'horizontal') {
    const a: Pos[] = [{ nx: MARGIN, ny: 0.5 }, { nx: 1 - MARGIN, ny: 0.5 }];
    for (let i = 0; i < 120; i++) frames.push([a[i % 2]]);
    return frames;
  }
  if (pattern === 'cross') {
    const a: Pos[] = [{ nx: MARGIN, ny: 0.5 }, { nx: 1 - MARGIN, ny: 0.5 }, { nx: 0.5, ny: MARGIN }, { nx: 0.5, ny: 1 - MARGIN }, { nx: 0.5, ny: 0.5 }];
    for (let i = 0; i < 150; i++) frames.push([a[i % a.length]]);
    return frames;
  }
  if (pattern === 'random') {
    for (let i = 0; i < 200; i++) frames.push([{ nx: MARGIN + rand() * (1 - 2 * MARGIN), ny: MARGIN + rand() * (1 - 2 * MARGIN) }]);
    return frames;
  }
  if (pattern === 'dual') {
    const rand2 = lcg(seed + 9999);
    const aA: Pos[] = [{ nx: MARGIN, ny: 0.3 }, { nx: 0.4, ny: 0.3 }, { nx: MARGIN, ny: 0.7 }, { nx: 0.4, ny: 0.7 }];
    const aB: Pos[] = [{ nx: 0.6, ny: 0.25 }, { nx: 1 - MARGIN, ny: 0.25 }, { nx: 0.6, ny: 0.75 }, { nx: 1 - MARGIN, ny: 0.75 }];
    let ai = 0, bi = 0;
    for (let i = 0; i < 200; i++) {
      frames.push([aA[ai % aA.length], aB[bi % aB.length]]);
      if (rand2() > 0.4) ai++;
      if (rand2() > 0.4) bi++;
    }
    return frames;
  }
  for (let i = 0; i < 400; i++) frames.push([{ nx: MARGIN + rand() * (1 - 2 * MARGIN), ny: MARGIN + rand() * (1 - 2 * MARGIN) }]);
  return frames;
}

function isBlink(frameIdx: number, blinkChance: number, seed: number) {
  return lcg(seed + frameIdx * 31337)() < blinkChance;
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DrillEyeTrack() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('select');
  const [activeN, setActiveN] = useState(1);
  const [counts, setCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const seedRef = useRef<number>(0);
  const escapedRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueuedRef = useRef(false);

  const loadCounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('drill_results').select('metadata, composite_score').eq('athlete_id', user.id).eq('drill_type', 'eye_track');
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of data ?? []) {
      const lvl: number = r.metadata?.level ?? r.composite_score;
      if (lvl >= 1 && lvl <= 5) c[lvl as 1|2|3|4|5]++;
    }
    setCounts(c);
  }, [user]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  function isUnlocked(n: number) { return n === 1 || (counts[n - 1] ?? 0) >= UNLOCK_AT; }
  function needed(n: number) { return Math.max(0, UNLOCK_AT - (counts[n - 1] ?? 0)); }

  useEffect(() => {
    if (phase !== 'session') return;
    const level = LEVELS[activeN - 1];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    escapedRef.current = false;
    saveQueuedRef.current = false;
    startRef.current = performance.now();
    seedRef.current = Math.floor(performance.now()) % 100000;

    const positions = getPositions(level.pattern, level.dotCount, seedRef.current);
    const timerInterval = setInterval(() => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      setTimeLeft(Math.max(0, level.totalDuration - elapsed));
    }, 100);

    async function save() {
      if (saveQueuedRef.current) return;
      saveQueuedRef.current = true;
      if (!user) return;
      await supabase.from('drill_results').insert({
        athlete_id: user.id, drill_type: 'eye_track',
        raw_score: level.totalDuration, composite_score: level.n,
        metadata: { level: level.n, duration_secs: level.totalDuration, time_of_day: new Date().toISOString() },
      });
      await loadCounts();
    }

    const dotStates: { frameIdx: number; frameStart: number; visible: boolean }[] =
      Array.from({ length: level.dotCount }, (_, i) => ({ frameIdx: i * 2, frameStart: 0, visible: true }));

    const DOT_COLORS = [RED, `rgba(235,228,210,0.9)`];

    function drawDot(x: number, y: number, scale: number, colorIdx: number) {
      const r = DOT_R * Math.max(0, scale);
      if (r <= 0) return;
      const color = DOT_COLORS[colorIdx % DOT_COLORS.length];
      ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = colorIdx === 0 ? 'rgba(255,48,64,0.08)' : 'rgba(235,228,210,0.05)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = colorIdx === 0 ? 'rgba(255,48,64,0.7)' : 'rgba(235,228,210,0.4)';
      ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
    }

    function tick(now: number) {
      const elapsed = now - startRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

      for (let d = 0; d < level.dotCount; d++) {
        const ds = dotStates[d];
        const timeInFrame = elapsed - ds.frameStart;
        const isBlinkFrame = level.blinkChance != null ? isBlink(ds.frameIdx, level.blinkChance, seedRef.current + d * 777) : false;
        const frameHold = isBlinkFrame ? (level.blinkMs ?? 110) : level.holdMs;

        if (timeInFrame >= frameHold) { ds.frameIdx = (ds.frameIdx + 1) % positions.length; ds.frameStart = elapsed; }

        const frameProgress = Math.min((elapsed - ds.frameStart) / frameHold, 1);
        const dotPos = level.pattern === 'dual'
          ? positions[ds.frameIdx % positions.length][d] ?? positions[ds.frameIdx % positions.length][0]
          : positions[ds.frameIdx % positions.length][0];

        const APPEAR = 0.12, DISAPPEAR = 0.88;
        let scale: number;
        if (frameProgress < APPEAR) {
          const t = frameProgress / APPEAR;
          scale = Math.min(t < 0.5 ? 2 * t * t : 1 + 0.3 * Math.sin(Math.PI * ((t - APPEAR) / (DISAPPEAR - APPEAR))) * Math.exp(-4 * t) + 0.2 * Math.sin(Math.PI * t), 1.25);
        } else if (frameProgress > DISAPPEAR) {
          scale = 1 - (frameProgress - DISAPPEAR) / (1 - DISAPPEAR);
        } else {
          scale = 1 + 0.04 * Math.sin(elapsed / 200);
        }

        drawDot(dotPos.nx * W, dotPos.ny * H, scale, d);
      }

      if (elapsed >= level.totalDuration * 1000) {
        save().then(() => { if (!escapedRef.current) setPhase('done'); });
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animRef.current); clearInterval(timerInterval); };
  }, [phase, activeN]); // eslint-disable-line

  function onHoldStart() {
    holdTimerRef.current = setTimeout(() => {
      escapedRef.current = true;
      cancelAnimationFrame(animRef.current);
      setPhase('select');
    }, 1000);
  }
  function onHoldEnd() {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  }

  const level = LEVELS[activeN - 1];

  // ── Select screen ─────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: BG, overflowY: 'auto',
        fontFamily: 'var(--font-body)', color: BONE,
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1.5rem 6rem' }}>
          {/* Back */}
          <button
            onClick={() => navigate('/drills')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(235,228,210,0.4)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)', marginBottom: '2rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.3)', marginBottom: '1rem' }}>
            Eye training
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 9vw, 5rem)',
            lineHeight: 0.92, letterSpacing: '-0.03em',
            marginBottom: '3rem', color: BONE,
          }}>
            Five levels.<br />One target.
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {LEVELS.map(lv => {
              const unlocked = isUnlocked(lv.n);
              const done = counts[lv.n] ?? 0;

              return (
                <div
                  key={lv.n}
                  onClick={() => unlocked && (setActiveN(lv.n), setPhase('session'))}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: 18,
                    background: 'rgba(235,228,210,0.04)',
                    border: `0.5px solid ${unlocked ? 'rgba(235,228,210,0.12)' : 'rgba(235,228,210,0.05)'}`,
                    opacity: unlocked ? 1 : 0.35,
                    cursor: unlocked ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: '1.25rem',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: unlocked ? RED : 'rgba(235,228,210,0.15)',
                    minWidth: 32, flexShrink: 0,
                  }}>
                    {lv.n < 10 ? `0${lv.n}` : lv.n}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: BONE }}>{lv.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(235,228,210,0.25)', letterSpacing: '0.04em' }}>{lv.totalDuration}s</p>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(235,228,210,0.4)', lineHeight: 1.5 }}>{lv.desc}</p>
                    {!unlocked && lv.n > 1 && (
                      <p style={{ fontSize: 11, color: 'rgba(235,228,210,0.2)', marginTop: 4 }}>
                        {needed(lv.n)} more on level {lv.n - 1} to unlock.
                      </p>
                    )}
                  </div>
                  {unlocked && (
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {done > 0 && <p style={{ fontSize: 11, color: 'rgba(235,228,210,0.3)' }}>{done}x</p>}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(235,228,210,0.25)' }}>
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Session screen ────────────────────────────────────────────────────────
  if (phase === 'session') {
    return (
      <div
        style={{ width: '100vw', height: '100vh', background: BG, position: 'relative', overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}
        onPointerDown={onHoldStart}
        onPointerUp={onHoldEnd}
        onPointerCancel={onHoldEnd}
        onPointerLeave={onHoldEnd}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* Top overlay */}
        <div style={{ position: 'absolute', top: 20, left: 24, right: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.2)' }}>
            {level.name}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: timeLeft <= 10 ? RED : 'rgba(235,228,210,0.25)' }}>
            {fmt(timeLeft)}
          </span>
        </div>

        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <p style={{ fontSize: 11, color: 'rgba(235,228,210,0.12)', letterSpacing: '0.06em' }}>Hold to exit</p>
        </div>
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', color: BONE,
      textAlign: 'center', padding: '2rem',
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.3)', marginBottom: '1.5rem' }}>
        Level {activeN} complete
      </p>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(4rem, 14vw, 7rem)',
        lineHeight: 0.9, letterSpacing: '-0.04em',
        color: BONE, marginBottom: '0.5rem',
      }}>
        {LEVELS[activeN - 1].totalDuration}s
      </p>
      <p style={{ fontSize: 14, color: 'rgba(235,228,210,0.4)', marginBottom: '3rem' }}>
        {LEVELS[activeN - 1].name}
      </p>

      {activeN < 5 && (() => {
        const rem = needed(activeN + 1);
        return rem > 0
          ? <p style={{ fontSize: 14, color: 'rgba(235,228,210,0.35)', marginBottom: '3rem' }}>{rem} more run{rem !== 1 ? 's' : ''} to unlock level {activeN + 1}.</p>
          : <p style={{ fontSize: 14, color: 'rgba(235,228,210,0.5)', marginBottom: '3rem' }}>Level {activeN + 1} unlocked.</p>;
      })()}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setPhase('session')}
          style={{
            background: BONE, color: BG,
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            padding: '14px 36px', borderRadius: 50, border: 'none', cursor: 'pointer',
          }}
        >
          Run again
        </button>
        <button
          onClick={() => setPhase('select')}
          style={{
            background: 'none', border: '0.5px solid rgba(235,228,210,0.2)',
            color: 'rgba(235,228,210,0.5)', fontFamily: 'var(--font-body)',
            fontSize: 14, padding: '14px 28px', borderRadius: 50, cursor: 'pointer',
          }}
        >
          Levels
        </button>
      </div>
    </div>
  );
}
