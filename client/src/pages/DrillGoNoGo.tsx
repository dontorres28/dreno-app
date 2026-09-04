import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

type Phase = 'intro' | 'running' | 'blank' | 'round_result' | 'done';

const TOTAL = 15;
const GO_COUNT = 11;
const ROUND_SIZE = 5;
const TOTAL_ROUNDS = TOTAL / ROUND_SIZE;
const SHOW_MS = 800;
const BLANK_MS = 500;

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

function buildSequence() {
  const seq = Array(GO_COUNT).fill('go').concat(Array(TOTAL - GO_COUNT).fill('nogo'));
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq as ('go' | 'nogo')[];
}

export default function DrillGoNoGo() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const tapColorWord = theme === 'light' ? 'black' : 'white';
  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [seq, setSeq] = useState<('go' | 'nogo')[]>(buildSequence);
  const [results, setResults] = useState<{ type: 'go' | 'nogo'; tapped: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const nextStimulus = useCallback((currentIdx: number, currentResults: { type: 'go' | 'nogo'; tapped: boolean }[]) => {
    if (currentIdx >= TOTAL) { setPhase('done'); return; }
    if (currentIdx > 0 && currentIdx % ROUND_SIZE === 0) { setPhase('round_result'); return; }
    setPhase('running');
    timerRef.current = setTimeout(() => {
      setResults(r => {
        const updated = [...r, { type: seq[currentIdx], tapped: false }];
        setIdx(currentIdx + 1);
        setPhase('blank');
        timerRef.current = setTimeout(() => nextStimulus(currentIdx + 1, updated), BLANK_MS);
        return updated;
      });
    }, SHOW_MS);
  }, [seq]);

  useEffect(() => () => clearTimer(), []);

  function handleTap() {
    if (phase !== 'running') return;
    clearTimer();
    setResults(r => {
      const updated = [...r, { type: seq[idx], tapped: true }];
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      setPhase('blank');
      timerRef.current = setTimeout(() => nextStimulus(nextIdx, updated), BLANK_MS);
      return updated;
    });
  }

  function start() { setSeq(buildSequence()); setIdx(0); setResults([]); nextStimulus(0, []); }
  function reset() { setPhase('intro'); setIdx(0); setResults([]); setSeq(buildSequence()); }
  function continueRound() { nextStimulus(results.length, results); }

  async function saveAndFinish() {
    if (!user) return;
    setSaving(true);
    const hits = results.filter(r => r.type === 'go' && r.tapped).length;
    const correctNogo = results.filter(r => r.type === 'nogo' && !r.tapped).length;
    const accuracy = Math.round((hits + correctNogo) / TOTAL * 100);
    const commissions = results.filter(r => r.type === 'nogo' && r.tapped).length;
    const omissions = results.filter(r => r.type === 'go' && !r.tapped).length;
    await supabase.from('drill_results').insert({
      athlete_id: user.id, drill_type: 'go_no_go',
      raw_score: accuracy, composite_score: accuracy,
      metadata: { hits, correctNogo, commissions, omissions, total: TOTAL },
    });
    setSaving(false);
    navigate('/drills');
  }

  const current = phase === 'running' ? seq[idx] : null;

  function roundStats(slice: typeof results) {
    const h = slice.filter(r => r.type === 'go' && r.tapped).length;
    const cn = slice.filter(r => r.type === 'nogo' && !r.tapped).length;
    const fa = slice.filter(r => r.type === 'nogo' && r.tapped).length;
    const om = slice.filter(r => r.type === 'go' && !r.tapped).length;
    return { hits: h, correctNogo: cn, commissions: fa, omissions: om, acc: Math.round((h + cn) / slice.length * 100) };
  }

  // ── Full-screen stimulus phase ─────────────────────────────────────────────
  if (phase === 'running' || phase === 'blank') {
    const isGo = current === 'go';
    return (
      <div
        onClick={handleTap}
        style={{
          position: 'fixed', inset: 0, background: 'var(--bg)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', WebkitUserSelect: 'none',
          fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}
      >
        {/* Progress bar (top) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--surface-border)' }}>
          <div style={{
            height: '100%', width: `${(results.length / TOTAL) * 100}%`,
            background: 'var(--red)', transition: `width 240ms ${EASE_OUT}`,
          }} />
        </div>

        {/* Round label */}
        <p style={{
          position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--w60)',
        }}>
          Round {Math.floor(results.length / ROUND_SIZE) + 1} of {TOTAL_ROUNDS}
        </p>

        {/* Stimulus */}
        {phase === 'running' ? (
          <div style={{
            width: 180, height: 180, borderRadius: '50%',
            background: isGo ? 'var(--white)' : 'var(--red)',
            boxShadow: isGo
              ? '0 0 80px rgba(255,255,255,0.08), 0 0 30px rgba(255,255,255,0.15) inset'
              : '0 0 80px rgba(255,48,64,0.4), 0 0 30px rgba(255,48,64,0.3) inset',
          }} />
        ) : (
          <div style={{
            width: 180, height: 180, borderRadius: '50%',
            border: '0.5px solid var(--surface-border-2)',
          }} />
        )}

        {/* Hint */}
        <p style={{ position: 'absolute', bottom: 40, fontSize: 11, letterSpacing: '0.14em', color: 'var(--w50)', textTransform: 'uppercase', fontWeight: 600 }}>
          tap anywhere
        </p>
      </div>
    );
  }

  // ── Shared shell for intro / round result / done ──────────────────────────
  const Shell = ({ children, showBack = true }: { children: React.ReactNode; showBack?: boolean }) => (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)', color: 'var(--white)',
      fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', flexShrink: 0 }}>
        {showBack && (
          <button
            onClick={() => navigate('/drills')}
            style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w70)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        )}
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>
          Go / No-go
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

  // ── Round result ───────────────────────────────────────────────────────────
  if (phase === 'round_result') {
    const completedRound = results.length / ROUND_SIZE;
    const roundSlice = results.slice(-ROUND_SIZE);
    const { hits, correctNogo, commissions, omissions, acc } = roundStats(roundSlice);
    const isLastRound = completedRound === TOTAL_ROUNDS;
    return (
      <Shell>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.5rem' }}>
            Round {completedRound} of {TOTAL_ROUNDS}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 13vw, 6.5rem)', lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--white)', marginBottom: '0.25rem' }}>
            {acc}
            <span style={{ fontSize: '0.35em', color: 'var(--w60)', marginLeft: 8, letterSpacing: '0.02em' }}>%</span>
          </p>
          <p style={{ fontSize: 14, color: 'var(--w70)', marginBottom: '2rem' }}>Accuracy</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '2rem' }}>
            {[
              { label: 'Correct go', val: hits, of: roundSlice.filter(r => r.type === 'go').length },
              { label: 'Correct hold', val: correctNogo, of: roundSlice.filter(r => r.type === 'nogo').length },
              { label: 'False alarms', val: commissions, bad: true },
              { label: 'Missed', val: omissions, bad: true },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
                borderRadius: 12, padding: '14px',
              }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.bad && s.val > 0 ? 'var(--red)' : 'var(--white)', marginBottom: 4, lineHeight: 1 }}>
                  {s.val}{s.of !== undefined ? `/${s.of}` : ''}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--w60)', letterSpacing: '0.02em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 48, padding: '0 36px' }}
            onClick={isLastRound ? () => setPhase('done') : continueRound}
          >
            {isLastRound ? 'See results' : 'Continue'}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Final result ───────────────────────────────────────────────────────────
  if (phase === 'done') {
    const hits = results.filter(r => r.type === 'go' && r.tapped).length;
    const correctNogo = results.filter(r => r.type === 'nogo' && !r.tapped).length;
    const commissions = results.filter(r => r.type === 'nogo' && r.tapped).length;
    const omissions = results.filter(r => r.type === 'go' && !r.tapped).length;
    const acc = Math.round((hits + correctNogo) / TOTAL * 100);
    const rating = acc >= 95 ? 'Elite' : acc >= 85 ? 'Sharp' : acc >= 70 ? 'Solid' : 'Warming up';
    return (
      <Shell>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.75rem' }}>
            {rating}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4.5rem, 14vw, 8rem)', lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--white)', marginBottom: '0.25rem' }}>
            {acc}
            <span style={{ fontSize: '0.28em', color: 'var(--w60)', marginLeft: 10, letterSpacing: '0.02em' }}>%</span>
          </p>
          <p style={{ fontSize: 14, color: 'var(--w70)', marginBottom: '2.5rem' }}>Overall accuracy</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '2.5rem' }}>
            {[
              { label: 'Correct go', val: hits, of: GO_COUNT },
              { label: 'Correct hold', val: correctNogo, of: TOTAL - GO_COUNT },
              { label: 'False alarms', val: commissions, bad: true },
              { label: 'Missed', val: omissions, bad: true },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
                borderRadius: 12, padding: '14px',
              }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: s.bad && s.val > 0 ? 'var(--red)' : 'var(--white)', marginBottom: 4, lineHeight: 1 }}>
                  {s.val}{s.of !== undefined ? `/${s.of}` : ''}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--w60)', letterSpacing: '0.02em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={reset}>Run again</button>
            <button className="btn-primary" disabled={saving} onClick={saveAndFinish}>
              {saving ? 'Saving…' : t('drillGoNoGo.save')}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '2rem' }}>
          Tap {tapColorWord}, hold on red
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--white)',
              boxShadow: '0 0 24px rgba(255,255,255,0.10)',
              margin: '0 auto 10px',
            }} />
            <p style={{ fontSize: 11, color: 'var(--w70)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Tap</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--red)',
              boxShadow: '0 0 24px rgba(255,48,64,0.3)',
              margin: '0 auto 10px',
            }} />
            <p style={{ fontSize: 11, color: 'var(--w70)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Hold</p>
          </div>
        </div>

        <p style={{ fontSize: 15, color: 'var(--w70)', lineHeight: 1.55, marginBottom: '2.5rem', maxWidth: 360, margin: '0 auto 2.5rem' }}>
          {TOTAL} signals over {TOTAL_ROUNDS} rounds. The hard part is stopping yourself.
        </p>

        <button className="btn-primary" style={{ fontSize: 15, height: 50, padding: '0 40px' }} onClick={start}>
          Start
        </button>
      </div>
    </Shell>
  );
}
