import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Phase = 'intro' | 'waiting' | 'ready' | 'active' | 'too_early' | 'between' | 'done';

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
    if (phase === 'intro') return;

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

      if (next.length >= TRIALS) {
        setPhase('done');
      } else {
        setTrial(t => t + 1);
        setPhase('between');
      }
      return;
    }

    if (phase === 'too_early') {
      startWaiting();
    }
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
    <Layout>
      {phase === 'intro' && (
        <div style={{ padding: '16px 24px' }}>
          <button
            onClick={() => navigate('/drills')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w60)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, padding: '8px 0', fontFamily: 'var(--font-body)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>
      )}
      <div
        style={{
          minHeight: phase === 'intro' ? 'calc(100vh - 180px)' : 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onClick={handleTap}
      >

        {phase === 'intro' && (
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1.5rem' }}>
              {t('drillReaction.title')}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2rem' }}>
              Tap when<br />you see red.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--w60)', lineHeight: 1.7, marginBottom: '3rem' }}>
              {t('drillReaction.instruction')}
            </p>
            <button
              className="btn-primary"
              style={{ fontSize: 16, padding: '16px 48px' }}
              onClick={e => { e.stopPropagation(); setTrial(0); startWaiting(); }}
            >
              Start
            </button>
          </div>
        )}

        {/* Waiting — gray circle, no action needed */}
        {phase === 'waiting' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              margin: '0 auto',
            }} />
            <p style={{ fontSize: 14, color: 'var(--w40)', marginTop: '2rem' }}>{t('drillReaction.waitPrompt')}</p>
          </div>
        )}

        {/* Too early */}
        {phase === 'too_early' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, color: 'var(--w40)', marginBottom: '2rem' }}>{t('drillReaction.tooEarly')}</p>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              margin: '0 auto 2rem',
            }} />
            <button
              className="btn-primary"
              style={{ fontSize: 14, padding: '12px 36px' }}
              onClick={e => { e.stopPropagation(); startWaiting(); }}
            >
              {t('drillReaction.tryAgain')}
            </button>
          </div>
        )}

        {/* Between trials — explicit Continue button */}
        {phase === 'between' && (
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            {lastTime !== null && (
              <>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3rem, 10vw, 5.5rem)',
                  lineHeight: 1, letterSpacing: '-0.03em',
                  color: lastTime < 250 ? '#22c55e' : lastTime < 400 ? '#f59e0b' : 'var(--red)',
                  marginBottom: '0.25rem',
                }}>
                  {lastTime} ms
                </p>
                <p style={{ fontSize: 14, color: 'var(--w40)', marginBottom: '2.5rem' }}>
                  trial {trial} {t('common.of')} {TRIALS}
                </p>
              </>
            )}
            <button
              className="btn-primary"
              style={{ fontSize: 14, padding: '12px 40px' }}
              onClick={e => { e.stopPropagation(); startWaiting(); }}
            >
              Next trial
            </button>
          </div>
        )}

        {phase === 'active' && (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'var(--red)',
              boxShadow: '0 0 60px rgba(255,48,64,0.5)',
              cursor: 'pointer',
            }}
          />
        )}

        {phase === 'done' && (
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1.5rem' }}>
              Done
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(4rem, 12vw, 7rem)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--red)',
                marginBottom: '0.5rem',
              }}
            >
              {med} ms
            </p>
            <p style={{ fontSize: 16, color: 'var(--w40)', marginBottom: '3rem' }}>{t('drillReaction.result')}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
              {times.map((t, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--surface-1)',
                    border: '0.5px solid var(--surface-border)',
                    borderRadius: 10,
                    padding: '10px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 18, fontWeight: 600 }}>{t}</p>
                  <p style={{ fontSize: 11, color: 'var(--w40)', marginTop: 2 }}>ms</p>
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              style={{ fontSize: 15, padding: '14px 40px' }}
              disabled={saving}
              onClick={e => { e.stopPropagation(); saveAndContinue(); }}
            >
              {saving ? t('drillReaction.saving') : t('drillReaction.save')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
