import type { CSSProperties } from 'react'

// The two lit-sphere materials shared by the tests. Pair with the .signal-orb
// class (adds the specular highlight) and a transform for the scale animation.
// Blue uses literal blues (reads the same in both themes); neutral is built on
// the theme's foreground token so it stays visible in light mode too.
export const blueOrb: CSSProperties = {
  background: 'radial-gradient(circle at 38% 30%, #CFE4FF 0%, #86BDFF 30%, #4299FF 60%, #1C6AD0 100%)',
  boxShadow:
    '0 24px 64px -14px rgba(77,166,255,0.55), 0 0 72px rgba(77,166,255,0.28), ' +
    'inset 0 3px 8px rgba(255,255,255,0.5), inset 0 -22px 46px rgba(10,52,124,0.5)',
}

export const neutralOrb: CSSProperties = {
  background: 'var(--white)',
  boxShadow:
    '0 20px 52px -18px rgba(0,0,0,0.4), ' +
    'inset 0 3px 8px rgba(255,255,255,0.55), inset 0 -16px 36px rgba(0,0,0,0.18)',
}
