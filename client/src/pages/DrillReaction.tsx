import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TestShell from '../components/test/TestShell'
import Readout from '../components/test/Readout'
import { haptics } from '../lib/haptics'
import { useReducedMotion } from '../hooks/useReducedMotion'

type Phase = 'intro' | 'waiting' | 'active' | 'too_early' | 'between' | 'done'

const TRIALS = 5
const MIN_DELAY = 1000
const MAX_DELAY = 3500
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

function rtToComposite(ms: number) {
  return Math.max(0, Math.min(100, Math.round(((600 - ms) / 400) * 100)))
}
function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}
function rating(ms: number) {
  if (ms < 250) return 'Elite'
  if (ms < 320) return 'Sharp'
  if (ms < 400) return 'Solid'
  return 'Warming up'
}

export default function DrillReaction() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('intro')
  const [trial, setTrial] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [lastTime, setLastTime] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (advanceRef.current) clearTimeout(advanceRef.current)
  }

  const startWaiting = useCallback(() => {
    setPhase('waiting')
    setLastTime(null)
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY)
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now()
      haptics.go()
      setPhase('active')
    }, delay)
  }, [])

  useEffect(() => () => clearTimers(), [])

  // The single react action, fired by pointer or keyboard.
  const react = useCallback(() => {
    const p = phaseRef.current
    if (p === 'waiting') {
      clearTimers()
      haptics.warn()
      setPhase('too_early')
      return
    }
    if (p === 'active') {
      phaseRef.current = 'between' // block a double-tap from recording a 2nd split before state commits
      const rt = Math.round(performance.now() - startRef.current)
      haptics.tap()
      setTimes(prev => {
        const next = [...prev, rt]
        if (next.length >= TRIALS) {
          haptics.ok()
          setPhase('done')
        } else {
          setTrial(t => t + 1)
          setLastTime(rt)
          setPhase('between')
          // Auto-advance: show the split for a beat, then the next trial arms
          // itself. One fewer tap per trial keeps the athlete in flow.
          advanceRef.current = setTimeout(() => startWaiting(), 1050)
        }
        return next
      })
      return
    }
    if (p === 'too_early') startWaiting()
  }, [startWaiting])

  // Spacebar / Enter mirror a tap during the active test.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      if (phaseRef.current === 'waiting' || phaseRef.current === 'active' || phaseRef.current === 'too_early') {
        e.preventDefault()
        react()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [react])

  async function saveAndContinue() {
    if (!user || times.length === 0) return
    setSaving(true)
    const med = median(times)
    await supabase.from('drill_results').insert({
      athlete_id: user.id,
      drill_type: 'reaction_time',
      raw_score: med,
      composite_score: rtToComposite(med),
      metadata: { trials: times },
    })
    setSaving(false)
    navigate('/drills')
  }

  function restart() {
    clearTimers()
    setTimes([]); setTrial(0); setLastTime(null); setPhase('intro')
  }

  const med = times.length > 0 ? median(times) : null

  // ── Active test: a bare, chrome-less field. Pure focus, lowest latency. ──
  if (phase === 'waiting' || phase === 'active' || phase === 'too_early') {
    const armed = phase === 'active'
    return (
      <div
        onPointerDown={react}
        style={{
          position: 'fixed', inset: 0, background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
          cursor: 'pointer', WebkitFontSmoothing: 'antialiased',
        }}
      >
        {phase === 'too_early' ? (
          <div style={{ textAlign: 'center', maxWidth: 340, padding: '0 1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)', lineHeight: 1, letterSpacing: '-0.035em', color: 'var(--white)', marginBottom: 14 }}>
              Too early
            </p>
            <p style={{ fontSize: 15, color: 'var(--w70)', lineHeight: 1.5 }}>
              Wait for the circle to fill, then tap. Tap anywhere to try again.
            </p>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Hairline rest ring, always present */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '0.5px solid var(--surface-border-2)',
                opacity: armed ? 0 : 1,
                transition: reduced ? 'none' : `opacity 160ms ${EASE}`,
              }} />
              {/* The signal */}
              <div style={{
                width: 216, height: 216, borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 90px rgba(77,166,255,0.5), inset 0 0 36px rgba(77,166,255,0.35)',
                opacity: armed ? 1 : 0,
                transform: armed ? 'scale(1)' : 'scale(0.9)',
                transition: reduced ? 'none' : `opacity 120ms ${EASE}, transform 160ms ${EASE}`,
                willChange: 'opacity, transform',
              }} />
            </div>
            <p style={{ position: 'absolute', bottom: 48, fontSize: 14, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
              {armed ? 'Tap' : 'Wait…'}
            </p>
          </>
        )}
      </div>
    )
  }

  // ── Between trials: the split, read like an instrument, auto-advancing. ──
  if (phase === 'between') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg)', color: 'var(--white)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', WebkitFontSmoothing: 'antialiased',
      }}>
        {lastTime !== null && (
          <Readout value={lastTime} unit="ms" size="clamp(3.5rem, 11vw, 6rem)" duration={500} />
        )}
        <div style={{ display: 'flex', gap: 7, marginTop: 36 }}>
          {Array.from({ length: TRIALS }).map((_, i) => (
            <span key={i} style={{
              width: 26, height: 3, borderRadius: 3,
              background: i < trial ? 'var(--accent)' : 'var(--surface-border-2)',
              transition: `background 300ms ${EASE}`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Intro ──
  if (phase === 'intro') {
    return (
      <TestShell title="Reaction" onBack={() => navigate('/drills')}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 7vw, 4.25rem)', lineHeight: 0.98, letterSpacing: '-0.035em', marginBottom: '1.25rem' }}>
            Tap the moment<br />it lights up
          </h1>
          <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.55, maxWidth: 340, margin: '0 auto 2.5rem' }}>
            Wait for the circle to fill, then tap as fast as you can. Five trials, we take the middle.
          </p>
          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 50, padding: '0 40px' }}
            onClick={() => { setTrial(0); setTimes([]); startWaiting() }}
          >
            Start
          </button>
          <p style={{ fontSize: 13, color: 'var(--w60)', marginTop: 22 }}>
            Space or tap to react
          </p>
        </div>
      </TestShell>
    )
  }

  // ── Done ──
  return (
    <TestShell title="Reaction" onBack={() => navigate('/drills')}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-strong)', letterSpacing: '-0.005em', marginBottom: 14 }}>
          {med !== null ? rating(med) : ''}
        </p>
        {med !== null && <Readout value={med} unit="ms" />}
        <p style={{ fontSize: 14, color: 'var(--w70)', margin: '14px 0 2.5rem' }}>
          Median of {TRIALS} trials
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '2.75rem', flexWrap: 'wrap' }}>
          {times.map((v, i) => (
            <div key={i} className="squircle" style={{
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
              borderRadius: 12, padding: '10px 14px', minWidth: 58,
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
              <p style={{ fontSize: 11, color: 'var(--w60)', marginTop: 4 }}>{i + 1}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={restart}>Run again</button>
          <button className="btn-primary" disabled={saving} onClick={saveAndContinue}>
            {saving ? 'Saving…' : 'Save & finish'}
          </button>
        </div>
      </div>
    </TestShell>
  )
}
