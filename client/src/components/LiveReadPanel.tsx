import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  bookingId: string
}

interface Signals {
  attention: number
  focus: number
  energy: number
}

function Bar({ label, value }: { label: string; value: number }) {
  const color =
    value > 65 ? '#4ade80' : value > 35 ? '#facc15' : 'var(--red)'
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-xs" style={{ color: 'var(--w60)' }}>{label}</p>
        <p className="text-xs font-medium" style={{ color }}>{value}</p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function LiveReadPanel({ bookingId }: Props) {
  const [signals, setSignals] = useState<Signals | null>(null)
  const [athleteActive, setAthleteActive] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel(`live-read-${bookingId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload === null || payload.attention === undefined) {
          setAthleteActive(false)
          setSignals(null)
        } else {
          setAthleteActive(true)
          setSignals(payload as Signals)
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [bookingId])

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--w45)' }}>
        Live Read
      </p>

      {!athleteActive ? (
        <div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--w40)' }}>
            Waiting for athlete to enable Live Read.
          </p>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--w20)' }}>
            Signals are processed on their device. Nothing leaves their browser.
          </p>
        </div>
      ) : signals ? (
        <>
          <Bar label="Attention" value={signals.attention} />
          <Bar label="Focus" value={signals.focus} />
          <Bar label="Energy" value={signals.energy} />
          <p className="text-xs mt-auto pt-4" style={{ color: 'var(--w20)' }}>
            On-device only. No video transmitted.
          </p>
        </>
      ) : null}
    </div>
  )
}
