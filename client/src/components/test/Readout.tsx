import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// The instrument readout: a number that counts up to its value on reveal and
// settles, the way a gauge needle swings home. Tabular figures so digits don't
// jitter, display face, unit as a quiet subscript. Instant under reduced motion.
export default function Readout({
  value,
  unit,
  prefix = '',
  size = 'clamp(4.5rem, 14vw, 8rem)',
  color = 'var(--white)',
  duration = 900,
}: {
  value: number
  unit?: string
  prefix?: string
  size?: string
  color?: string
  duration?: number
}) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? value : 0)
  const raf = useRef(0)

  useEffect(() => {
    if (reduced) { setShown(value); return }
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4) // ease-out-quart: fast then settle
      setShown(from + (value - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setShown(value)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration, reduced])

  return (
    <p
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.045em',
        color,
        fontVariantNumeric: 'tabular-nums',
        margin: 0,
      }}
    >
      {prefix}{Math.round(shown)}
      {unit && (
        <span style={{ fontSize: '0.26em', color: 'var(--w60)', marginLeft: 8, letterSpacing: '0.01em' }}>
          {unit}
        </span>
      )}
    </p>
  )
}
