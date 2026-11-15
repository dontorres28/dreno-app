import { useEffect, useState } from 'react'
import { ArrowRight, UsersThree, ChatCircle, VideoCamera, CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { supabase } from '../lib/supabase'
import { apiPost, apiGet } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  starts_at: string
  status: string
  profiles: { name: string | null } | null
}

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

function completenessOf(coach: any): number {
  if (!coach) return 0
  const fields = ['headline', 'bio', 'credentials', 'hourly_rate', 'photo_url', 'sports', 'expertise_tags']
  const filled = fields.filter(f => {
    const v = coach[f]
    if (Array.isArray(v)) return v.length > 0
    return !!v
  }).length
  return Math.round((filled / fields.length) * 100)
}

function when(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function nameInitial(name?: string | null) { return (name ?? 'A')[0].toUpperCase() }

function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.4, color: 'var(--w70)', letterSpacing: '-0.02em',
    }}>
      {nameInitial(name)}
    </div>
  )
}

// Plain 7-day view: a filled dot for each day with a session.
function WeekDots({ bookings }: { bookings: Booking[] }) {
  const today = new Date()
  const bookedDays = new Set(bookings.filter(b => b.status === 'confirmed').map(b => new Date(b.starts_at).toDateString()))
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : -(dow - 1)
  const monday = new Date(today); monday.setDate(today.getDate() + mondayOffset)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return { booked: bookedDays.has(d.toDateString()), isToday: d.toDateString() === today.toDateString(), label: d.toLocaleDateString('en-GB', { weekday: 'short' })[0], date: d.getDate() }
  })
  const count = days.filter(d => d.booked).length
  return (
    <div className="squircle" style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 22, padding: 'clamp(20px, 5vw, 26px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)' }}>This week</p>
        <p style={{ fontSize: 13.5, color: 'var(--w60)' }}>{count === 0 ? 'No sessions' : `${count} day${count !== 1 ? 's' : ''} with sessions`}</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: d.isToday ? 'var(--accent-strong)' : 'var(--w45)' }}>{d.label}</span>
            <div style={{
              width: '100%', aspectRatio: '1 / 1', maxWidth: 42, minHeight: 30, borderRadius: '50%',
              background: d.booked ? 'var(--accent)' : 'transparent',
              border: d.booked ? 'none' : d.isToday ? '1.5px solid var(--accent-strong)' : '1px solid var(--surface-border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `background 300ms ${EASE}`,
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '-0.02em', color: d.booked ? 'var(--btn-ink)' : 'var(--w50)' }}>{d.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CoachDashboard() {
  const { user, profile } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [checkInAgg, setCheckInAgg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  async function load() {
    if (!user) return
    try {
      const [bookRes, coachRes] = await Promise.all([
        supabase.from('bookings')
          .select('id, starts_at, status, profiles!bookings_athlete_id_fkey(name)')
          .eq('coach_id', user.id).in('status', ['confirmed', 'pending']).order('starts_at'),
        supabase.from('coaches').select('*').eq('id', user.id).single(),
      ])
      if (bookRes.error) throw bookRes.error
      if (coachRes.error) throw coachRes.error
      setBookings((bookRes.data ?? []) as unknown as Booking[])
      setCoach(coachRes.data)
      apiGet('/api/coach/check-in-aggregate').then(d => setCheckInAgg(d)).catch(() => {})
    } catch (err: any) {
      toast.error(err.message ?? 'Could not load dashboard')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [user])

  async function confirm(id: string) {
    setActing(id)
    try { await apiPost(`/api/bookings/${id}/confirm`, {}); toast.success('Confirmed.'); load() }
    catch (err: any) { toast.error(err.message ?? 'Could not confirm') }
    finally { setActing(null) }
  }
  async function cancel(id: string) {
    setActing(id)
    try { await apiPost(`/api/bookings/${id}/cancel`, {}); toast.success('Cancelled.'); load() }
    catch (err: any) { toast.error(err.message ?? 'Could not cancel') }
    finally { setActing(null) }
  }

  const firstName = profile?.name?.split(' ')[0] ?? null
  const pct = completenessOf(coach)
  const uniqueAthletes = new Set(bookings.map(b => b.profiles?.name).filter(Boolean)).size
  const verStatus = coach?.verified_status ?? 'pending'
  const statusColor = verStatus === 'verified' ? 'var(--white)' : verStatus === 'rejected' ? 'var(--accent)' : 'var(--w70)'
  const statusLabel = verStatus === 'verified' ? 'Verified' : verStatus === 'rejected' ? 'Needs changes' : 'Under review'

  const pending = bookings.filter(b => b.status === 'pending')
  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.starts_at) >= new Date())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const nextSession = upcoming[0] ?? null

  if (loading) {
    return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}><Spinner size={28} /></div></Layout>
  }

  const sectionLabel: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: 'var(--w70)', marginBottom: 12, paddingLeft: 2 }
  const cardBase: React.CSSProperties = { background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', borderRadius: 18 }

  return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Greeting + verification */}
        <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: '0.4rem', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 0.92, letterSpacing: '-0.04em', marginBottom: '0.75rem' }}>
          {firstName ? `Hi, ${firstName}.` : 'Dashboard'}
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 50, background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)', marginBottom: '2.25rem' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
        </div>
        {verStatus === 'rejected' && coach?.rejection_reason && (
          <p style={{ fontSize: 13, color: 'var(--w70)', marginBottom: '2rem', lineHeight: 1.5 }}>{coach.rejection_reason}</p>
        )}

        {/* New requests — the thing that needs the coach */}
        {pending.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={sectionLabel}>New requests</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map(b => (
                <div key={b.id} className="squircle" style={{ ...cardBase, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={b.profiles?.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.profiles?.name ?? 'Athlete'}</p>
                    <p style={{ fontSize: 13, color: 'var(--w60)', marginTop: 2 }}>Wants a session, {when(b.starts_at)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button className="btn-primary" style={{ fontSize: 12.5, minHeight: 34, padding: '0 16px' }} disabled={acting === b.id} onClick={() => confirm(b.id)}>
                      {acting === b.id ? <Spinner size={12} /> : 'Accept'}
                    </button>
                    <button onClick={() => cancel(b.id)} disabled={acting === b.id} style={{ fontSize: 12.5, color: 'var(--w60)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '6px 2px' }}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next session */}
        <p style={sectionLabel}>Next session</p>
        {nextSession ? (
          <Link to={`/session/${nextSession.id}`} className="squircle" style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', textDecoration: 'none', color: 'inherit', marginBottom: '2rem' }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'rgba(77,166,255,0.12)', border: '0.5px solid rgba(77,166,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoCamera size={18} weight="fill" color="var(--accent)" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>{nextSession.profiles?.name ?? 'Athlete'}</p>
              <p style={{ fontSize: 13.5, color: 'var(--w60)', marginTop: 2 }}>{when(nextSession.starts_at)}</p>
            </div>
            <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent-strong)' }}>{timeOnly(nextSession.starts_at)}</span>
          </Link>
        ) : (
          <div className="squircle" style={{ ...cardBase, padding: '18px 20px', marginBottom: '2rem' }}>
            <p style={{ fontSize: 14.5, color: 'var(--w70)' }}>Nothing booked yet. Athletes can book you once your profile is verified.</p>
          </div>
        )}

        {/* This week */}
        <div style={{ marginBottom: '2rem' }}>
          <WeekDots bookings={bookings} />
        </div>

        {/* Roster + Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2rem' }}>
          <Link to="/coach/athletes" className="squircle" style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
            <UsersThree size={22} weight="duotone" color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--white)' }}>Your athletes</p>
              <p style={{ fontSize: 13, color: 'var(--w60)', marginTop: 1 }}>{uniqueAthletes} athlete{uniqueAthletes !== 1 ? 's' : ''}</p>
            </div>
            <CaretRight size={16} weight="bold" color="var(--w40)" />
          </Link>
          <Link to="/messages" className="squircle" style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
            <ChatCircle size={22} weight="duotone" color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--white)' }}>Messages</p>
              <p style={{ fontSize: 13, color: 'var(--w60)', marginTop: 1 }}>Reply and follow up</p>
            </div>
            <CaretRight size={16} weight="bold" color="var(--w40)" />
          </Link>
        </div>

        {/* Athlete feedback (only when there's enough) */}
        {checkInAgg?.response_count_30d >= 5 && (
          <div className="squircle" style={{ ...cardBase, borderRadius: 22, padding: '1.5rem 1.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--w70)' }}>Athlete feedback, last 30 days</p>
              <p style={{ fontSize: 12.5, color: 'var(--w60)' }}>{checkInAgg.response_count_30d} replies</p>
            </div>
            <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-0.035em', color: 'var(--white)' }}>{checkInAgg.useful_rate_30d}%</span>
                <span style={{ fontSize: 12.5, color: 'var(--w70)', marginLeft: 6 }}>found it useful</span>
              </div>
              {checkInAgg.mood_avg_30d !== null && (
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-0.035em', color: 'var(--white)' }}>{checkInAgg.mood_avg_30d}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--w70)', marginLeft: 6 }}>average mood</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming sessions */}
        {upcoming.length > 0 && (
          <div>
            <p style={sectionLabel}>Upcoming sessions</p>
            <div className="squircle" style={{ ...cardBase, borderRadius: 20, overflow: 'hidden' }}>
              {upcoming.map((b, i) => (
                <div key={b.id} style={{ padding: '14px 18px', borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={b.profiles?.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.profiles?.name ?? 'Athlete'}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--w60)', marginTop: 2 }}>{when(b.starts_at)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Link to={`/session/${b.id}`} className="btn-primary" style={{ fontSize: 12, minHeight: 32, padding: '0 14px', textDecoration: 'none' }}>Join</Link>
                    <button onClick={() => cancel(b.id)} disabled={acting === b.id} style={{ fontSize: 12, color: 'var(--w60)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '5px 2px' }}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finish profile nudge */}
        {pct < 100 && (
          <Link to="/coach/profile/edit" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', paddingTop: 16, marginTop: '0.5rem', borderTop: '0.5px solid var(--surface-border)' }}>
            <span style={{ flex: 1, fontSize: 14.5, color: 'var(--w70)' }}>
              Your profile is <span style={{ color: 'var(--white)', fontWeight: 600 }}>{pct}%</span> done. Finish it so athletes can find you.
            </span>
            <ArrowRight size={15} weight="bold" color="var(--accent-strong)" style={{ flexShrink: 0 }} />
          </Link>
        )}

      </div>
    </Layout>
  )
}
