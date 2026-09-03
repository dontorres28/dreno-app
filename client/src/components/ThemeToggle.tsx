import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={!isDark}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        height: 28, width: 52, borderRadius: 50,
        border: '0.5px solid var(--line-2)',
        background: 'var(--toggle-bg)',
        cursor: 'pointer', flexShrink: 0,
        transition: 'border-color 0.3s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--w40)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
    >
      {/* Sliding knob */}
      <motion.div
        aria-hidden
        animate={{
          x: isDark ? 26 : 2,
          backgroundColor: isDark ? '#2a3547' : '#f0f2f7',
        }}
        transition={{ type: 'spring', stiffness: 480, damping: 34, mass: 0.9 }}
        style={{
          position: 'absolute', top: 2,
          width: 22, height: 22, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.45)'
            : '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        {isDark ? (
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M12 9.3A5.5 5.5 0 0 1 4.7 2a5.5 5.5 0 1 0 7.3 7.3Z" fill="#c8d0e0"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#6b7a96" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="10" cy="10" r="3.5"/>
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4"/>
          </svg>
        )}
      </motion.div>

      {/* Static background icons */}
      <span aria-hidden style={{
        position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)',
        opacity: isDark ? 0.7 : 0, transition: 'opacity 0.25s', pointerEvents: 'none',
        display: 'flex', alignItems: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="var(--w50)" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10" cy="10" r="3.5"/>
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4"/>
        </svg>
      </span>
      <span aria-hidden style={{
        position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
        opacity: isDark ? 0 : 0.6, transition: 'opacity 0.25s', pointerEvents: 'none',
        display: 'flex', alignItems: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
          <path d="M12 9.3A5.5 5.5 0 0 1 4.7 2a5.5 5.5 0 1 0 7.3 7.3Z" fill="var(--w50)"/>
        </svg>
      </span>
    </button>
  );
}
