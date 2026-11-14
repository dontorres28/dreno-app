import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { haptics } from '../lib/haptics'
import TestShell from '../components/test/TestShell'
import Readout from '../components/test/Readout'
import { blueOrb, neutralOrb } from '../components/test/orbStyles'

type Phase = 'intro' | 'running' | 'blank' | 'round_result' | 'done'

const TOTAL = 15
const GO_COUNT = 11
const ROUND_SIZE = 5
const TOTAL_ROUNDS = TOTAL / ROUND_SIZE
const SHOW_MS = 1300
const BLANK_MS = 700
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

function buildSequence() {
  const seq = Array(GO_COUNT).fill('go').concat(Array(TOTAL - GO_COUNT).fill('nogo'))
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seq[i], seq[j]] = [seq[j], seq[i]]
  }
  return seq as ('go' | 'nogo')[]
}

export default function DrillGoNoGo() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('intro')
  const [idx, setIdx] = useState(0)
  const [seq, setSeq] = useState<('go' | 'nogo')[]>(buildSequence)
  const [results, setResults] = useState<{ type: 'go' | 'nogo'; tapped: boolean }[]>([])
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }

  const nextStimulus = useCallback((currentIdx: number, currentResults: { type: 'go' | 'nogo'; tapped: boolean }[]) => {
    if (currentIdx >= TOTAL) { setPhase('done'); return }
    if (currentIdx > 0 && currentIdx % ROUND_SIZE === 0) { setPhase('round_result'); return }
    setPhase('running')
    timerRef.current = setTimeout(() => {
      setResults(r => {
        const updated = [...r, { type: seq[currentIdx], tapped: false }]
        setIdx(currentIdx + 1)
        setPhase('blank')
        timerRef.current = setTimeout(() => nextStimulus(currentIdx + 1, updated), BLANK_MS)
        return updated
      })
    }, SHOW_MS)
  }, [seq])

  useEffect(() => () => clearTimer(), [])

  // Success tick when a result screen lands.
  useEffect(() => {
    if (phase === 'round_result' || phase === 'done') haptics.ok()
  }, [phase])

  const tap = useCallback(() => {
    if (phaseRef.current !== 'running') return
    clearTimer()
    const type = seq[idx]
    if (type === 'nogo') haptics.warn()  // a false alarm — you moved on a freeze
    else haptics.tap()
    setResults(r => {
      const updated = [...r, { type, tapped: true }]
      const nextIdx = idx + 1
      setIdx(nextIdx)
      setPhase('blank')
      timerRef.current = setTimeout(() => nextStimulus(nextIdx, updated), BLANK_MS)
      return updated
    })
  }, [idx, seq, nextStimulus])

  // Spacebar mirrors a tap during the live test.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && phaseRef.current === 'running') { e.preventDefault(); tap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tap])

  function start() { setSeq(buildSequence()); setIdx(0); setResults([]); nextStimulus(0, []) }
  function reset() { clearTimer(); setPhase('intro'); setIdx(0); setResults([]); setSeq(buildSequence()) }
  function continueRound() { nextStimulus(results.length, results) }

  async function saveAndFinish() {
    if (!user) return
    setSaving(true)
    const hits = results.filter(r => r.type === 'go' && r.tapped).length
    const correctNogo = results.filter(r => r.type === 'nogo' && !r.tapped).length
    const accuracy = Math.round(((hits + correctNogo) / TOTAL) * 100)
    const commissions = results.filter(r => r.type === 'nogo' && r.tapped).length
    const omissions = results.filter(r => r.type === 'go' && !r.tapped).length
    await supabase.from('drill_results').insert({
      athlete_id: user.id, drill_type: 'go_no_go',
      raw_score: accuracy, composite_score: accuracy,
      metadata: { hits, correctNogo, commissions, omissions, total: TOTAL },
    })
    setSaving(false)
    navigate('/drills')
  }

  const current = phase === 'running' ? seq[idx] : null

  function roundStats(slice: typeof results) {
    const h = slice.filter(r => r.type === 'go' && r.tapped).length
    const cn = slice.filter(r => r.type === 'nogo' && !r.tapped).length
    const fa = slice.filter(r => r.type === 'nogo' && r.tapped).length
    const om = slice.filter(r => r.type === 'go' && !r.tapped).length
    return { hits: h, correctNogo: cn, commissions: fa, omissions: om, acc: Math.round(((h + cn) / slice.length) * 100) }
  }

  const StatGrid = ({ stats }: { stats: { label: string; val: number; of?: number; bad?: boolean }[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '2.25rem' }}>
      {stats.map(s => (
        <div key={s.label} className="squircle" style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 14, padding: 15 }}>
          <p style={{ fontSize: 23, fontWeight: 700, color: s.bad && s.val > 0 ? 'var(--accent-strong)' : 'var(--white)', marginBottom: 4, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {s.val}{s.of !== undefined ? `/${s.of}` : ''}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--w60)', letterSpacing: '-0.005em' }}>{s.label}</p>
        </div>
      ))}
    </div>
  )

  // ── Live test: bare, chrome-less field ──
  if (phase === 'running' || phase === 'blank') {
    const isGo = current === 'go'
    return (
      <div
        onPointerDown={tap}
        style={{
          position: 'fixed', inset: 0, background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
          fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}
      >
        {/* Progress hairline */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--surface-border)' }}>
          <div style={{ height: '100%', width: `${(results.length / TOTAL) * 100}%`, background: 'var(--accent)', transition: `width 240ms ${EASE}` }} />
        </div>

        <p style={{ position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
          Round {Math.floor(results.length / ROUND_SIZE) + 1} of {TOTAL_ROUNDS}
        </p>

        <div style={{ position: 'relative', width: 184, height: 184 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '0.5px solid var(--surface-border-2)',
            opacity: phase === 'blank' ? 1 : 0,
            transition: reduced ? 'none' : `opacity 200ms ${EASE}`,
          }} />
          <div className="signal-orb" style={{
            position: 'absolute', inset: 0,
            ...(isGo ? neutralOrb : blueOrb),
            opacity: phase === 'running' ? 1 : 0,
            transform: phase === 'running' ? 'scale(1)' : 'scale(0.9)',
            transition: reduced ? 'none' : `opacity 190ms ${EASE}, transform 240ms cubic-bezier(0.2,0.9,0.3,1.15)`,
            willChange: 'opacity, transform',
          }} />
        </div>

        <p style={{ position: 'absolute', bottom: 44, fontSize: 14, color: 'var(--w50)', letterSpacing: '-0.005em' }}>
          Tap, but freeze on blue
        </p>
      </div>
    )
  }

  // ── Round result ──
  if (phase === 'round_result') {
    const completedRound = results.length / ROUND_SIZE
    const roundSlice = results.slice(-ROUND_SIZE)
    const { hits, correctNogo, commissions, omissions, acc } = roundStats(roundSlice)
    const isLastRound = completedRound === TOTAL_ROUNDS
    return (
      <TestShell title="Go / No-go" onBack={() => navigate('/drills')}>
        <div className={reduced ? '' : 'materialize'} style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-strong)', letterSpacing: '-0.005em', marginBottom: 12 }}>
            Round {completedRound} of {TOTAL_ROUNDS}
          </p>
          <Readout value={acc} unit="%" size="clamp(4rem, 13vw, 6.5rem)" />
          <p style={{ fontSize: 14, color: 'var(--w70)', margin: '12px 0 1.75rem' }}>Accuracy</p>
          <StatGrid stats={[
            { label: 'Correct go', val: hits, of: roundSlice.filter(r => r.type === 'go').length },
            { label: 'Correct freeze', val: correctNogo, of: roundSlice.filter(r => r.type === 'nogo').length },
            { label: 'False alarms', val: commissions, bad: true },
            { label: 'Missed', val: omissions, bad: true },
          ]} />
          <button className="btn-primary" style={{ fontSize: 15, height: 48, padding: '0 36px' }} onClick={isLastRound ? () => setPhase('done') : continueRound}>
            {isLastRound ? 'See results' : 'Continue'}
          </button>
        </div>
      </TestShell>
    )
  }

  // ── Final result ──
  if (phase === 'done') {
    const hits = results.filter(r => r.type === 'go' && r.tapped).length
    const correctNogo = results.filter(r => r.type === 'nogo' && !r.tapped).length
    const commissions = results.filter(r => r.type === 'nogo' && r.tapped).length
    const omissions = results.filter(r => r.type === 'go' && !r.tapped).length
    const acc = Math.round(((hits + correctNogo) / TOTAL) * 100)
    const rating = acc >= 95 ? 'Elite' : acc >= 85 ? 'Sharp' : acc >= 70 ? 'Solid' : 'Warming up'
    return (
      <TestShell title="Go / No-go" onBack={() => navigate('/drills')}>
        <div className={reduced ? '' : 'materialize'} style={{ textAlign: 'center', maxWidth: 460 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-strong)', letterSpacing: '-0.005em', marginBottom: 14 }}>
            {rating}
          </p>
          <Readout value={acc} unit="%" />
          <p style={{ fontSize: 14, color: 'var(--w70)', margin: '14px 0 2.5rem' }}>Overall accuracy</p>
          <StatGrid stats={[
            { label: 'Correct go', val: hits, of: GO_COUNT },
            { label: 'Correct freeze', val: correctNogo, of: TOTAL - GO_COUNT },
            { label: 'False alarms', val: commissions, bad: true },
            { label: 'Missed', val: omissions, bad: true },
          ]} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={reset}>Run again</button>
            <button className="btn-primary" disabled={saving} onClick={saveAndFinish}>
              {saving ? 'Saving…' : 'Save & finish'}
            </button>
          </div>
        </div>
      </TestShell>
    )
  }

  // ── Intro ──
  return (
    <TestShell title="Go / No-go" onBack={() => navigate('/drills')}>
      <div className={reduced ? '' : 'materialize'} style={{ textAlign: 'center', maxWidth: 460 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.75rem, 7vw, 4.25rem)', lineHeight: 0.98, letterSpacing: '-0.035em', marginBottom: '2rem' }}>
          Tap fast.<br />Freeze on blue.
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="signal-orb" style={{ width: 60, height: 60, ...neutralOrb, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em' }}>Tap</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="signal-orb" style={{ width: 60, height: 60, ...blueOrb, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em' }}>Freeze</p>
          </div>
        </div>
        <p style={{ fontSize: 15, color: 'var(--w70)', lineHeight: 1.55, maxWidth: 340, margin: '0 auto 2.5rem' }}>
          {TOTAL} signals over {TOTAL_ROUNDS} rounds. The hard part is stopping yourself.
        </p>
        <button className="btn-primary" style={{ fontSize: 15, height: 50, padding: '0 40px' }} onClick={start}>
          Start
        </button>
      </div>
    </TestShell>
  )
}
