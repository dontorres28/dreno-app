import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

type Pattern = 'horizontal' | 'cross' | 'random' | 'dual' | 'rapid';
type Phase = 'select' | 'brief' | 'session' | 'done';

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
  { n: 1, name: 'Saccade',  desc: 'Snap left to right. No tracking, just snap.',       pattern: 'horizontal', totalDuration: 45, holdMs: 700, dotCount: 1 },
  { n: 2, name: 'Cross',    desc: 'Four directions. Full range of motion.',            pattern: 'cross',      totalDuration: 60, holdMs: 520, dotCount: 1 },
  { n: 3, name: 'Random',   desc: 'Unpredictable positions anywhere on screen.',       pattern: 'random',     totalDuration: 75, holdMs: 400, dotCount: 1 },
  { n: 4, name: 'Split',    desc: 'Two dots moving independently. Track both.',        pattern: 'dual',       totalDuration: 90, holdMs: 480, dotCount: 2 },
  { n: 5, name: 'Rapid',    desc: 'Fast random. Some positions blink and vanish.',     pattern: 'rapid',      totalDuration: 90, holdMs: 260, dotCount: 1, blinkChance: 0.3, blinkMs: 110 },
];

const UNLOCK_AT = 5;
const DOT_R = 14;
const MARGIN = 0.12;
const RED = '#FF3040';

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

function themeBg() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000';
}
function themeText() {
  return getComputedStyle(document.documentElement).getPropertyValue('--white').trim() || '#fff';
}

// Shared shell for select/done
const Shell = ({ children, showBack = true, title, onBack }: { children: React.ReactNode; showBack?: boolean; title: string; onBack?: () => void }) => (
  <div style={{
    minHeight: '100dvh', background: 'var(--bg)', color: 'var(--white)',
    fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column',
    WebkitFontSmoothing: 'antialiased',
  }}>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', flexShrink: 0 }}>
      {showBack && (
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 1.5rem 3rem' }}>
      {children}
    </div>
  </div>
);

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
    const bg = themeBg();
    const text = themeText();

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

    function drawDot(x: number, y: number, scale: number, colorIdx: number) {
      const r = DOT_R * Math.max(0, scale);
      if (r <= 0) return;
      const color = colorIdx === 0 ? RED : text;
      ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = colorIdx === 0 ? 'rgba(255,48,64,0.10)' : `rgba(${hexToRgb(text)},0.08)`; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = colorIdx === 0 ? 'rgba(255,48,64,0.7)' : `rgba(${hexToRgb(text)},0.5)`;
      ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0;
    }

    function tick(now: number) {
      const elapsed = now - startRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

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
      <Shell title="Eye training" onBack={() => navigate('/drills')}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 7vw, 4rem)',
            lineHeight: 0.95, letterSpacing: '-0.035em',
            marginBottom: '2rem',
          }}>
            Five levels, one target
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LEVELS.map(lv => {
              const unlocked = isUnlocked(lv.n);
              const done = counts[lv.n] ?? 0;
              return (
                <button
                  key={lv.n}
                  disabled={!unlocked}
                  onClick={() => { setActiveN(lv.n); setPhase('brief'); }}
                  style={{
                    all: 'unset',
                    padding: '16px 18px',
                    borderRadius: 14,
                    background: 'var(--surface-1)',
                    border: '0.5px solid var(--surface-border-2)',
                    opacity: unlocked ? 1 : 0.4,
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    transition: 'background 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => { if (unlocked) { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--line-2)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.borderColor = 'var(--surface-border-2)'; }}
                >
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: unlocked ? 'var(--red)' : 'var(--w40)',
                    minWidth: 34, flexShrink: 0,
                  }}>
                    0{lv.n}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)' }}>{lv.name}</p>
                      <p style={{ fontSize: 11.5, color: 'var(--w60)', letterSpacing: '0.02em' }}>{lv.totalDuration}s</p>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--w70)', lineHeight: 1.5 }}>{lv.desc}</p>
                    {!unlocked && lv.n > 1 && (
                      <p style={{ fontSize: 11.5, color: 'var(--w60)', marginTop: 4 }}>
                        {needed(lv.n)} more on level {lv.n - 1} to unlock.
                      </p>
                    )}
                  </div>
                  {unlocked && (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--w60)' }}>
                      {done > 0 && <span style={{ fontSize: 11, letterSpacing: '0.04em' }}>{done}×</span>}
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  }

  // ── Brief (per-level explanation before start) ────────────────────────────
  if (phase === 'brief') {
    return (
      <Shell title={`Level ${level.n} · ${level.name}`} onBack={() => setPhase('select')}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1rem' }}>
            Follow the dot with your eyes
          </h1>
          <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.55, marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
            {level.desc}
          </p>

          {/* Animated preview dot */}
          <div style={{
            position: 'relative', width: 200, height: 80, margin: '0 auto 2.25rem',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: 0,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--red)',
              boxShadow: '0 0 24px rgba(255,48,64,0.5)',
              transform: 'translateY(-50%)',
              animation: `eyePreview ${level.holdMs * 2}ms cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            }} />
          </div>

          <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--white)', marginBottom: 6 }}>
                {level.totalDuration}<span style={{ fontSize: '0.5em', color: 'var(--w60)', marginLeft: 2 }}>s</span>
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>duration</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--white)', marginBottom: 6 }}>
                {level.dotCount}
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>{level.dotCount === 1 ? 'target' : 'targets'}</p>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '2rem', letterSpacing: '0.02em' }}>
            Sit still. Move only your eyes. Hold anywhere on screen to exit.
          </p>

          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 50, padding: '0 44px' }}
            onClick={() => setPhase('session')}
          >
            Start
          </button>

          <style>{`
            @keyframes eyePreview {
              0%, 100% { left: 10px; }
              50% { left: 170px; }
            }
          `}</style>
        </div>
      </Shell>
    );
  }

  // ── Session (canvas) ──────────────────────────────────────────────────────
  if (phase === 'session') {
    return (
      <div
        style={{ width: '100vw', height: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}
        onPointerDown={onHoldStart}
        onPointerUp={onHoldEnd}
        onPointerCancel={onHoldEnd}
        onPointerLeave={onHoldEnd}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

        <div style={{ position: 'absolute', top: 20, left: 24, right: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--w60)' }}>
            {level.name}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: timeLeft <= 10 ? 'var(--red)' : 'var(--w60)' }}>
            {fmt(timeLeft)}
          </span>
        </div>

        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <p style={{ fontSize: 11, color: 'var(--w50)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Hold to exit</p>
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  const nextN = activeN + 1;
  const rem = nextN <= 5 ? needed(nextN) : 0;
  return (
    <Shell title="Eye training" showBack={false}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.75rem' }}>
          Level {activeN} complete
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4.5rem, 14vw, 8rem)', lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--white)', marginBottom: '0.25rem' }}>
          {LEVELS[activeN - 1].totalDuration}
          <span style={{ fontSize: '0.28em', color: 'var(--w60)', marginLeft: 10, letterSpacing: '0.02em' }}>s</span>
        </p>
        <p style={{ fontSize: 14, color: 'var(--w70)', marginBottom: '2rem' }}>{LEVELS[activeN - 1].name}</p>

        {nextN <= 5 && (
          <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '2rem' }}>
            {rem > 0 ? `${rem} more run${rem !== 1 ? 's' : ''} to unlock level ${nextN}.` : `Level ${nextN} unlocked.`}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setPhase('select')}>All levels</button>
          <button className="btn-primary" onClick={() => setPhase('brief')}>Run again</button>
        </div>
      </div>
    </Shell>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`;
}
