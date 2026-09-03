import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import Tooltip from './Tooltip';

// Matches the Settings-page slider exactly: 260ms iOS ease
const TWEEN = { type: 'tween' as const, duration: 0.26, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

function haptic() {
  try { navigator.vibrate?.(6); } catch { /* not supported */ }
}

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const reduced = useReducedMotion();
  const isDark = theme === 'dark';

  const onClick = () => { toggle(); haptic(); };

  const knobTransition = reduced
    ? { type: 'tween' as const, duration: 0.12, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
    : TWEEN;

  return (
    <Tooltip label={isDark ? 'Switch to light' : 'Switch to dark'} side="bottom">
      <button
        onClick={onClick}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        role="switch"
        aria-checked={isDark}
        className="theme-toggle-slider"
        style={{
          position: 'relative',
          width: 40, height: 24,
          borderRadius: 50,
          border: 'none',
          padding: 0,
          background: isDark ? 'var(--red)' : 'var(--surface-2)',
          cursor: 'pointer', flexShrink: 0,
          transition: 'background 220ms cubic-bezier(0.23, 1, 0.32, 1)',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: isDark ? 16 : 0 }}
          transition={knobTransition}
          style={{
            position: 'absolute',
            top: 3, left: 3,
            width: 18, height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.10)',
            willChange: 'transform',
          }}
        />
        <style>{`
          .theme-toggle-slider::before {
            content: '';
            position: absolute;
            inset: -10px;
            border-radius: 50%;
          }
          .theme-toggle-slider:active {
            transform: scale(0.94);
            transition: transform 90ms cubic-bezier(0.4, 0, 1, 1);
          }
          @media (prefers-reduced-motion: reduce) {
            .theme-toggle-slider:active { transform: none; }
          }
        `}</style>
      </button>
    </Tooltip>
  );
}
