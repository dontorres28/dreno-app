import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

type Phase = 'intro' | 'waiting' | 'active' | 'too_early' | 'between' | 'done';

const TRIALS = 5;
const MIN_DELAY = 1000;
const MAX_DELAY = 3500;

function rtToComposite(ms: number) {
  return Math.max(0, Math.min(100, Math.round((600 - ms) / 400 * 100)));
}

function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function rating(ms: number) {
  if (ms < 250) return 'Elite';
  if (ms < 320) return 'Sharp';
  if (ms < 400) return 'Solid';
  return 'Warming up';
}

export default function DrillReaction() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [trial, setTrial] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const startWaiting = useCallback(() => {
    setPhase('waiting');
    setLastTime(null);
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase('active');
    }, delay);
  }, []);

  useEffect(() => () => clearTimer(), []);

  function handleTap() {
    if (phase === 'intro' || phase === 'done') return;

    if (phase === 'waiting') {
      clearTimer();
      setPhase('too_early');
      return;
    }

    if (phase === 'active') {
      const rt = Math.round(performance.now() - startRef.current);
      const next = [...times, rt];
      setTimes(next);
      setLastTime(rt);

      if (next.length >= TRIALS) setPhase('done');
      else {
        setTrial(t => t + 1);
        setPhase('between');
      }
      return;
    }

    if (phase === 'too_early') startWaiting();
  }

  async function saveAndContinue() {
    if (!user || times.length === 0) return;
    setSaving(true);
    const med = median(times);
    const comp = rtToComposite(med);
    await supabase.from('drill_results').insert({
      athlete_id: user.id,
      drill_type: 'reaction_time',
      raw_score: med,
      composite_score: comp,
      metadata: { trials: times },
    });
    setSaving(false);
    navigate('/drills');
  }

  const med = times.length > 0 ? median(times) : null;

  return (
    <div
      onClick={handleTap}
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--white)',
        fontFamily: 'var(--font-body)',
        display: 'flex', flexDirection: 'column',
        userSelect: 'none', WebkitUserSelect: 'none',
        cursor: (phase === 'waiting' || phase === 'active') ? 'pointer' : 'default',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Top bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); navigate('/drills'); }}
          style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w70)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)' }}>
          Reaction time
        </p>
        <div style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)' }} onClick={e => e.stopPropagation()}>
          <ThemeToggle />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 1.5rem 3rem' }}>

        {/* ── Intro ── */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', maxWidth: 460 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 7vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1.25rem' }}>
              Tap when<br />you see red
            </h1>
            <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.55, marginBottom: '2.5rem', maxWidth: 360, margin: '0 auto 2.5rem' }}>
              {t('drillReaction.instruction')}
            </p>
            <button
              className="btn-primary"
              style={{ fontSize: 15, height: 50, padding: '0 40px' }}
              onClick={e => { e.stopPropagation(); setTrial(0); setTimes([]); startWaiting(); }}
            >
              Start
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: '2.5rem' }}>
              {Array.from({ length: TRIALS }).map((_, i) => (
                <span key={i} style={{ width: 24, height: 3, borderRadius: 3, background: 'var(--surface-border-2)' }} />
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--w60)', marginTop: 12, letterSpacing: '0.04em' }}>{TRIALS} trials</p>
          </div>
        )}

        {/* ── Waiting ── */}
        {phase === 'waiting' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 200, height: 200, borderRadius: '50%',
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
              margin: '0 auto',
            }} />
            <p style={{ fontSize: 14, color: 'var(--w60)', marginTop: '2rem', letterSpacing: '0.02em' }}>
              Wait for red…
            </p>
          </div>
        )}

        {/* ── Active — the big red circle ── */}
        {phase === 'active' && (
          <div style={{
            width: 220, height: 220, borderRadius: '50%',
            background: 'var(--red)',
            boxShadow: '0 0 80px rgba(255,48,64,0.5), 0 0 30px rgba(255,48,64,0.35) inset',
          }} />
        )}

        {/* ── Too early ── */}
        {phase === 'too_early' && (
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1.25rem' }}>
              Too early
            </p>
            <p style={{ fontSize: 15, color: 'var(--w70)', marginBottom: '2.5rem', lineHeight: 1.5 }}>
              Wait for the circle to turn red.
            </p>
            <button
              className="btn-primary"
              style={{ fontSize: 15, height: 48, padding: '0 32px' }}
              onClick={e => { e.stopPropagation(); startWaiting(); }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Between trials ── */}
        {phase === 'between' && (
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w60)', marginBottom: '0.75rem' }}>
              Trial {trial} of {TRIALS}
            </p>
            {lastTime !== null && (
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.5rem, 10vw, 6rem)',
                lineHeight: 1, letterSpacing: '-0.04em',
                color: 'var(--white)',
                marginBottom: '0.25rem',
              }}>
                {lastTime}
                <span style={{ fontSize: '0.35em', color: 'var(--w60)', marginLeft: 8, letterSpacing: '0.02em' }}>ms</span>
              </p>
            )}

            {/* Trial dots progress */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: '2rem', marginBottom: '2.25rem' }}>
              {Array.from({ length: TRIALS }).map((_, i) => (
                <span key={i} style={{
                  width: 24, height: 3, borderRadius: 3,
                  background: i < trial ? 'var(--red)' : 'var(--surface-border-2)',
                }} />
              ))}
            </div>

            <button
              className="btn-primary"
              style={{ fontSize: 15, height: 48, padding: '0 36px' }}
              onClick={e => { e.stopPropagation(); startWaiting(); }}
            >
              Next
            </button>
          </div>
        )}

        {/* ── Done ── */}
        {phase === 'done' && med !== null && (
          <div style={{ textAlign: 'center', maxWidth: 460 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.75rem' }}>
              {rating(med)}
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4.5rem, 14vw, 8rem)',
              lineHeight: 1, letterSpacing: '-0.045em',
              color: 'var(--white)', marginBottom: '0.25rem',
            }}>
              {med}
              <span style={{ fontSize: '0.28em', color: 'var(--w60)', marginLeft: 10, letterSpacing: '0.02em' }}>ms</span>
            </p>
            <p style={{ fontSize: 14, color: 'var(--w70)', marginBottom: '2.75rem' }}>
              Median across {TRIALS} trials.
            </p>

            {/* Trial breakdown */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '2.75rem', flexWrap: 'wrap' }}>
              {times.map((v, i) => (
                <div key={i} style={{
                  background: 'var(--surface-1)',
                  border: '0.5px solid var(--surface-border-2)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  minWidth: 60,
                }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>{v}</p>
                  <p style={{ fontSize: 10, color: 'var(--w60)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>#{i + 1}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn-secondary"
                onClick={e => { e.stopPropagation(); setPhase('intro'); setTimes([]); setTrial(0); }}
              >
                Run again
              </button>
              <button
                className="btn-primary"
                disabled={saving}
                onClick={e => { e.stopPropagation(); saveAndContinue(); }}
              >
                {saving ? 'Saving…' : 'Save & finish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
