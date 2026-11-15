import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Barbell, NotePencil, VideoCamera, Target, ArrowRight, Check, CaretRight } from '@phosphor-icons/react'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

interface Booking {
  id: string; starts_at: string; status: string
  coaches: { profiles: { name: string | null } | null } | null
}
interface Goal { id: string; title: string; horizon: string }
interface DrillResult { completed_at: string }

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// One clear thing to do today. Tap the whole row.
function TaskRow({ to, Icon, title, sub, done, badge }: {
  to: string; Icon: any; title: string; sub: string; done?: boolean; badge?: string
}) {
  return (
    <Link
      to={to}
      className="squircle"
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
        textDecoration: 'none', color: 'inherit',
        background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
        borderRadius: 18,
        transition: `background 180ms ${EASE}, border-color 180ms ${EASE}, transform 150ms ${EASE}`,
      }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--surface-hover)'; el.style.borderColor = 'var(--line-2)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'var(--surface-1)'; el.style.borderColor = 'var(--surface-border-2)'; el.style.transform = 'translateY(0)' }}
    >
      {/* Left: a tick circle for daily tasks, or an icon for a session */}
      {done === undefined ? (
        <span style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'rgba(77,166,255,0.12)', border: '0.5px solid rgba(77,166,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} weight="fill" color="var(--accent)" />
        </span>
      ) : (
        <span style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: done ? 'var(--accent)' : 'transparent',
          border: done ? 'none' : '1.5px solid var(--w40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `background 220ms ${EASE}`,
        }}>
          {done && <Check size={14} weight="bold" color="var(--btn-ink)" />}
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: done ? 'var(--w60)' : 'var(--white)', textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'var(--w40)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--w60)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>
      </div>

      {badge ? (
        <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent-strong)' }}>{badge}</span>
      ) : (
        <CaretRight size={16} weight="bold" color="var(--w40)" style={{ flexShrink: 0 }} />
      )}
    </Link>
  )
}

// A plain 7-day view: fill a dot for each day you trained.
function WeekDots({ drillResults }: { drillResults: DrillResult[] }) {
  const doneDays = new Set(drillResults.map(d => new Date(d.completed_at).toDateString()))
  const today = new Date()
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : -(dow - 1)
  const monday = new Date(today); monday.setDate(today.getDate() + mondayOffset)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return { done: doneDays.has(d.toDateString()), isToday: d.toDateString() === today.toDateString(), label: d.toLocaleDateString('en-GB', { weekday: 'short' })[0], date: d.getDate() }
  })
  const count = days.filter(d => d.done).length

  return (
    <div className="squircle" style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 22, padding: 'clamp(20px, 5vw, 26px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)' }}>This week</p>
        <p style={{ fontSize: 13.5, color: 'var(--w60)' }}>
          {count === 0 ? 'No games yet' : `${count} day${count !== 1 ? 's' : ''} trained`}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: d.isToday ? 'var(--accent-strong)' : 'var(--w45)' }}>{d.label}</span>
            <div style={{
              width: '100%', aspectRatio: '1 / 1', maxWidth: 42, minHeight: 30, borderRadius: '50%',
              background: d.done ? 'var(--accent)' : 'transparent',
              border: d.done ? 'none' : d.isToday ? '1.5px solid var(--accent-strong)' : '1px solid var(--surface-border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `background 300ms ${EASE}`,
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '-0.02em', color: d.done ? 'var(--btn-ink)' : 'var(--w50)' }}>{d.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [nextBooking, setNextBooking] = useState<Booking | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [drillResults, setDrillResults] = useState<DrillResult[]>([])
  const [drillDoneToday, setDrillDoneToday] = useState(false)
  const [journalDoneToday, setJournalDoneToday] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

        const [bookRes, goalRes, drillRes, journalRes] = await Promise.all([
          supabase.from('bookings').select('*, coaches:coach_id(profiles(name))')
            .eq('athlete_id', user!.id).eq('status', 'confirmed')
            .gte('starts_at', new Date().toISOString()).order('starts_at'),
          supabase.from('goals').select('id, title, horizon')
            .eq('athlete_id', user!.id).eq('status', 'active').order('created_at', { ascending: true }).limit(5),
          supabase.from('drill_results').select('completed_at')
            .eq('athlete_id', user!.id).gte('completed_at', monthAgo.toISOString()),
          supabase.from('journal_entries').select('created_at')
            .eq('athlete_id', user!.id).order('created_at', { ascending: false }).limit(1),
        ])

        setNextBooking(bookRes.data?.[0] ?? null)
        setGoals(goalRes.data ?? [])
        const drills: DrillResult[] = drillRes.data ?? []
        setDrillResults(drills)
        setDrillDoneToday(drills.some(d => new Date(d.completed_at) >= todayStart))
        const je = journalRes.data ?? []
        if (je[0]) setJournalDoneToday(new Date(je[0].created_at) >= todayStart)
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load your home')
      } finally { setLoading(false) }
    }
    load()
  }, [user])

  const firstName = profile?.name?.split(' ')[0] ?? null

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={28} /></div></Layout>
  }

  const sessionDate = nextBooking ? new Date(nextBooking.starts_at) : null
  const sessionToday = !!(sessionDate && sessionDate.toDateString() === new Date().toDateString())
  const coachName = nextBooking?.coaches?.profiles?.name ?? 'your coach'

  return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Greeting */}
        <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '0.4rem', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 0.92, letterSpacing: '-0.04em', marginBottom: '2.25rem' }}>
          {firstName ? `${t('dashboard.hi')}, ${firstName}.` : 'Home'}
        </h1>

        {/* Today — the clear path */}
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--w70)', marginBottom: 12, paddingLeft: 2 }}>Today</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2rem' }}>
          {sessionToday && nextBooking && (
            <TaskRow to={`/session/${nextBooking.id}`} Icon={VideoCamera} title={`Meet ${coachName}`} sub="Your video session" badge={timeLabel(nextBooking.starts_at)} />
          )}
          <TaskRow to="/drills" Icon={Barbell} title="Play a game" sub="Train your reaction and focus" done={drillDoneToday} />
          <TaskRow to="/journal" Icon={NotePencil} title="Write how you feel" sub="A quick note about your day" done={journalDoneToday} />
        </div>

        {/* This week */}
        <div style={{ marginBottom: '2rem' }}>
          <WeekDots drillResults={drillResults} />
        </div>

        {/* Next session (if it's not today) or find a coach */}
        {nextBooking && sessionDate && !sessionToday ? (
          <Link to={`/session/${nextBooking.id}`} className="squircle" style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', marginBottom: '2rem',
            textDecoration: 'none', color: 'inherit',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 18,
          }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'rgba(77,166,255,0.12)', border: '0.5px solid rgba(77,166,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoCamera size={18} weight="fill" color="var(--accent)" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>Next session</p>
              <p style={{ fontSize: 13.5, color: 'var(--w60)', marginTop: 2 }}>
                {coachName}, {sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {timeLabel(nextBooking.starts_at)}
              </p>
            </div>
            <CaretRight size={16} weight="bold" color="var(--w40)" style={{ flexShrink: 0 }} />
          </Link>
        ) : !nextBooking ? (
          <Link to="/coaches" className="squircle" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '2rem',
            textDecoration: 'none',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 18, padding: '18px 20px',
          }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>Talk to a coach</p>
              <p style={{ fontSize: 13.5, color: 'var(--w60)', marginTop: 2 }}>Someone to help your head game.</p>
            </div>
            <span className="btn-primary" style={{ fontSize: 13, minHeight: 38, padding: '0 18px', flexShrink: 0 }}>Find a coach</span>
          </Link>
        ) : null}

        {/* Goals — quiet link */}
        <Link to="/goals" style={{
          display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
          paddingTop: 14, borderTop: '0.5px solid var(--surface-border)',
        }}>
          <Target size={18} weight="duotone" color="var(--accent)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 15, color: 'var(--white)' }}>
            {goals.length > 0 ? `Your goals (${goals.length})` : 'Set a goal'}
          </span>
          <ArrowRight size={14} weight="bold" color="var(--w50)" />
        </Link>

      </div>
    </Layout>
  )
}
