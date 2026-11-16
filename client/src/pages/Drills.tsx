import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Trophy } from '@phosphor-icons/react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Result { drill_type: string; completed_at: string }

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

// Four games, in order. Names and one-liners a 10-year-old gets at a glance.
const TESTS = [
  { key: 'reaction_time', name: 'Quick Tap',     what: 'Tap the moment it lights up.',          to: '/drills/reaction' },
  { key: 'go_no_go',      name: 'Stop & Go',      what: 'Tap fast, but freeze on blue.',         to: '/drills/go-no-go' },
  { key: 'eye_track',     name: 'Follow the Dot', what: 'Keep your eyes on the moving dot.',      to: '/drills/eye-track' },
  { key: 'the_sigh',      name: 'Breathe',        what: 'Breathe with the circle to reset fast.',  to: '/drills/sigh' },
]

function TestRow({ n, name, what, to, done }: { n: number; name: string; what: string; to: string; done: boolean }) {
  return (
    <Link
      to={to}
      className="squircle"
      style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '20px 22px', textDecoration: 'none', color: 'inherit',
        background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
        borderRadius: 20,
        transition: `background 200ms ${EASE}, border-color 200ms ${EASE}, transform 160ms ${EASE}`,
      }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--surface-hover)'; el.style.borderColor = 'var(--line-2)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'var(--surface-1)'; el.style.borderColor = 'var(--surface-border-2)'; el.style.transform = 'translateY(0)' }}
    >
      {/* Step number — the path is 1, 2, 3, 4 */}
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, letterSpacing: '-0.03em',
        color: done ? 'var(--accent-strong)' : 'var(--w40)', minWidth: 30, flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {n}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 21, lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--white)', marginBottom: 3 }}>
          {name}
        </p>
        <p style={{ fontSize: 14, color: 'var(--w70)', lineHeight: 1.45 }}>{what}</p>
      </div>

      {/* Clear path: a check once done today, otherwise an obvious play arrow */}
      {done ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-strong)', fontSize: 13.5, fontWeight: 600, flexShrink: 0 }}>
          <Check size={16} weight="bold" /> Done
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent-strong)', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
          Play <ArrowRight size={15} weight="bold" />
        </span>
      )}
    </Link>
  )
}

export default function Drills() {
  const { user } = useAuth()
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('drill_results')
      .select('drill_type, completed_at')
      .eq('athlete_id', user.id)
      .then(({ data }) => { setResults(data ?? []); setLoading(false) })
  }, [user])

  const today = new Date().toISOString().slice(0, 10)
  const doneToday = new Set(results.filter(r => r.completed_at.slice(0, 10) === today).map(r => r.drill_type))

  const streak = (() => {
    let s = 0
    const t = new Date()
    for (let i = 0; i < 60; i++) {
      const d = new Date(t); d.setDate(d.getDate() - i)
      if (results.some(r => r.completed_at.slice(0, 10) === d.toISOString().slice(0, 10))) s++
      else break
    }
    return s
  })()

  const doneCount = TESTS.filter(tst => doneToday.has(tst.key)).length

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Header — plain and clear */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '0.6rem' }}>
          Train your brain
        </h1>
        <p style={{ fontSize: 16, color: 'var(--w70)', lineHeight: 1.5, marginBottom: '2rem' }}>
          Four quick games. A few minutes a day.
        </p>

        {/* Today — one simple line */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 15, color: 'var(--w70)' }}>
              <span style={{ color: 'var(--white)', fontWeight: 600 }}>{doneCount} of 4</span> done today
            </p>
            {streak > 0 && (
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent-strong)' }}>
                {streak}-day streak
              </span>
            )}
          </div>
        )}

        {/* The four games, in order */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TESTS.map((tst, i) => (
              <TestRow key={tst.key} n={i + 1} name={tst.name} what={tst.what} to={tst.to} done={doneToday.has(tst.key)} />
            ))}
          </div>
        )}

        {/* Scores */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Link
            to="/drills/leaderboard"
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--w70)',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '11px 18px', borderRadius: 50,
              border: '0.5px solid var(--surface-border-2)', background: 'var(--surface-1)',
              textDecoration: 'none', transition: `color 180ms ${EASE}, border-color 180ms ${EASE}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--w70)'; e.currentTarget.style.borderColor = 'var(--surface-border-2)' }}
          >
            <Trophy size={16} weight="fill" /> See the scoreboard
          </Link>
        </div>
      </div>
    </Layout>
  )
}
