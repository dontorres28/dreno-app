import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Phase = 'intro' | 'running' | 'blank' | 'round_result' | 'done';

const TOTAL = 15;
const GO_COUNT = 11;
const ROUND_SIZE = 5;
const TOTAL_ROUNDS = TOTAL / ROUND_SIZE;
const SHOW_MS = 800;
const BLANK_MS = 500;

const BG   = '#0D1B2A';
const BONE = '#EBE4D2';
const RED  = '#FF3040';

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
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [seq] = useState<('go' | 'nogo')[]>(buildSequence);
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

  function start() { setIdx(0); setResults([]); nextStimulus(0, []); }
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

  // ── Full-screen active phase ───────────────────────────────────────────────
  if (phase === 'running' || phase === 'blank') {
    const isGo = current === 'go';
    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: BG,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', WebkitUserSelect: 'none',
          fontFamily: 'var(--font-body)',
        }}
        onClick={handleTap}
      >
        {/* Progress bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(235,228,210,0.08)' }}>
          <div style={{ height: '100%', width: `${(results.length / TOTAL) * 100}%`, background: 'rgba(235,228,210,0.35)', transition: 'width 0.2s' }} />
        </div>

        {/* Round label */}
        <p style={{
          position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(235,228,210,0.2)',
        }}>
          Round {Math.floor(results.length / ROUND_SIZE) + 1} of {TOTAL_ROUNDS}
        </p>

        {/* Stimulus circle */}
        {phase === 'running' ? (
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: isGo ? BONE : RED,
            boxShadow: isGo
              ? '0 0 80px rgba(235,228,210,0.25), 0 0 160px rgba(235,228,210,0.08)'
              : '0 0 80px rgba(255,48,64,0.35), 0 0 160px rgba(255,48,64,0.12)',
            transition: 'background 0.04s, box-shadow 0.04s',
          }} />
        ) : (
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            border: '0.5px solid rgba(235,228,210,0.08)',
          }} />
        )}

        {/* Hint */}
        <p style={{ position: 'absolute', bottom: 48, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(235,228,210,0.15)' }}>
          tap anywhere
        </p>
      </div>
    );
  }

  // ── Round result ───────────────────────────────────────────────────────────
  if (phase === 'round_result') {
    const completedRound = results.length / ROUND_SIZE;
    const roundSlice = results.slice(-ROUND_SIZE);
    const { hits, correctNogo, commissions, omissions, acc } = roundStats(roundSlice);
    const isLastRound = completedRound === TOTAL_ROUNDS;

    return (
      <div style={{
        position: 'fixed', inset: 0, background: BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', fontFamily: 'var(--font-body)', color: BONE,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.3)', marginBottom: '1.5rem' }}>
          Round {completedRound} of {TOTAL_ROUNDS}
        </p>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(5rem, 16vw, 8rem)',
          lineHeight: 0.9, letterSpacing: '-0.04em',
          color: BONE, marginBottom: '0.25rem',
        }}>
          {acc}%
        </p>
        <p style={{ fontSize: 14, color: 'rgba(235,228,210,0.4)', marginBottom: '3rem' }}>accuracy</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', width: '100%', maxWidth: 360, marginBottom: '3rem' }}>
          {[
            { label: 'Correct go', val: hits, of: roundSlice.filter(r => r.type === 'go').length, bad: false },
            { label: 'Correct hold', val: correctNogo, of: roundSlice.filter(r => r.type === 'nogo').length, bad: false },
            { label: 'False alarms', val: commissions, bad: true },
            { label: 'Missed', val: omissions, bad: true },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(235,228,210,0.04)', border: '0.5px solid rgba(235,228,210,0.1)',
              borderRadius: 14, padding: '1rem',
            }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.bad && s.val > 0 ? RED : BONE, marginBottom: 4 }}>
                {s.val}{s.of !== undefined ? `/${s.of}` : ''}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(235,228,210,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={isLastRound ? () => setPhase('done') : continueRound}
          style={{
            background: BONE, color: BG,
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            padding: '14px 48px', borderRadius: 50, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          {isLastRound ? 'Results' : 'Continue'}
        </button>
      </div>
    );
  }

  // ── Final result ───────────────────────────────────────────────────────────
  if (phase === 'done') {
    const hits = results.filter(r => r.type === 'go' && r.tapped).length;
    const correctNogo = results.filter(r => r.type === 'nogo' && !r.tapped).length;
    const commissions = results.filter(r => r.type === 'nogo' && r.tapped).length;
    const omissions = results.filter(r => r.type === 'go' && !r.tapped).length;
    const acc = Math.round((hits + correctNogo) / TOTAL * 100);
    return (
      <div style={{
        position: 'fixed', inset: 0, background: BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', fontFamily: 'var(--font-body)', color: BONE,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(235,228,210,0.3)', marginBottom: '1.5rem' }}>
          {t('drillGoNoGo.score')}
        </p>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(5rem, 18vw, 9rem)',
          lineHeight: 0.9, letterSpacing: '-0.04em',
          color: BONE, marginBottom: '0.25rem',
        }}>
          {acc}%
        </p>
        <p style={{ fontSize: 14, color: 'rgba(235,228,210,0.4)', marginBottom: '3rem' }}>{t('drillGoNoGo.accuracy')}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', width: '100%', maxWidth: 360, marginBottom: '3rem' }}>
          {[
            { label: 'Correct go', val: hits, of: GO_COUNT, bad: false },
            { label: 'Correct hold', val: correctNogo, of: TOTAL - GO_COUNT, bad: false },
            { label: 'False alarms', val: commissions, bad: true },
            { label: 'Missed', val: omissions, bad: true },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(235,228,210,0.04)', border: '0.5px solid rgba(235,228,210,0.1)',
              borderRadius: 14, padding: '1rem',
            }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.bad && s.val > 0 ? RED : BONE, marginBottom: 4 }}>
                {s.val}{s.of !== undefined ? `/${s.of}` : ''}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(235,228,210,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={saveAndFinish}
          disabled={saving}
          style={{
            background: BONE, color: BG,
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            padding: '14px 48px', borderRadius: 50, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em', opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : t('drillGoNoGo.save')}
        </button>
      </div>
    );
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '16px 24px' }}>
        <button
          onClick={() => navigate('/drills')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w60)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </div>
      <div style={{
        minHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1.5rem' }}>
            {t('drillGoNoGo.title')}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 9vw, 5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', marginBottom: '2.5rem' }}>
            Tap white.<br />Stop red.
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--white)',
                boxShadow: '0 0 24px rgba(235,228,210,0.15)',
                margin: '0 auto 10px',
              }} />
              <p style={{ fontSize: 12, color: 'var(--w40)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Tap</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--red)',
                boxShadow: '0 0 24px rgba(255,48,64,0.2)',
                margin: '0 auto 10px',
              }} />
              <p style={{ fontSize: 12, color: 'var(--w40)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Stop</p>
            </div>
          </div>

          <p style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.7, marginBottom: '3rem' }}>
            {TOTAL} signals across {TOTAL_ROUNDS} rounds. The hard part is stopping yourself.
          </p>

          <button className="btn-primary" style={{ fontSize: 15, padding: '15px 48px' }} onClick={start}>
            Start
          </button>
        </div>
      </div>
    </Layout>
  );
}
