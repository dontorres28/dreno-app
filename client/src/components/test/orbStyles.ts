import type { CSSProperties } from 'react'

// The two lit-sphere materials shared by the tests. Pair with the .signal-orb
// class (adds the specular highlight) and a transform for the scale animation.
// Blue uses literal blues (reads the same in both themes); neutral is built on
// the theme's foreground token so it stays visible in light mode too.
export const blueOrb: CSSProperties = {
  background: 'radial-gradient(circle at 40% 34%, #9FC8FF 0%, #6FB0FF 38%, #4299FF 66%, #2A77D6 100%)',
  boxShadow:
    '0 16px 40px -18px rgba(11,60,140,0.45), ' +   // soft grounded shadow, no coloured bloom
    'inset 0 1px 3px rgba(255,255,255,0.18), inset 0 -18px 40px rgba(10,52,124,0.4)',
}

export const neutralOrb: CSSProperties = {
  background: 'var(--white)',
  boxShadow:
    '0 14px 36px -20px rgba(0,0,0,0.3), ' +
    'inset 0 1px 3px rgba(255,255,255,0.3), inset 0 -14px 32px rgba(0,0,0,0.14)',
}
