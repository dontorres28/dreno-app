import { useState, useRef, ReactNode, useEffect, cloneElement, isValidElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Shared "recently opened" state — moving between tooltips skips the delay
let recentlyOpen = false;
let recentTimer: ReturnType<typeof setTimeout> | null = null;
const markOpen = () => {
  recentlyOpen = true;
  if (recentTimer) clearTimeout(recentTimer);
};
const markClose = () => {
  if (recentTimer) clearTimeout(recentTimer);
  recentTimer = setTimeout(() => { recentlyOpen = false; }, 200);
};

interface Props {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  offset?: number;
}

const SPRING = { type: 'spring' as const, stiffness: 700, damping: 40, mass: 0.4 };

export default function Tooltip({ label, children, side = 'bottom', delay = 400, offset = 8 }: Props) {
  const [show, setShow] = useState(false);
  const [instant, setInstant] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const open = () => {
    if (timer.current) clearTimeout(timer.current);
    if (recentlyOpen) {
      setInstant(true);
      setShow(true);
      markOpen();
    } else {
      setInstant(false);
      timer.current = setTimeout(() => { setShow(true); markOpen(); }, delay);
    }
  };
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setShow(false);
    markClose();
  };

  // Position styles per side
  const posStyles = (() => {
    switch (side) {
      case 'top':    return { bottom: `calc(100% + ${offset}px)`, left: '50%', translateX: '-50%', translateY: 0 };
      case 'bottom': return { top: `calc(100% + ${offset}px)`, left: '50%', translateX: '-50%', translateY: 0 };
      case 'left':   return { right: `calc(100% + ${offset}px)`, top: '50%', translateX: 0, translateY: '-50%' };
      case 'right':  return { left: `calc(100% + ${offset}px)`, top: '50%', translateX: 0, translateY: '-50%' };
    }
  })();
  const originVec = side === 'top' ? { y: 4 } : side === 'bottom' ? { y: -4 } : side === 'left' ? { x: 4 } : { x: -4 };

  // Try to inherit event handlers on the child so keyboard focus opens the tip
  const trigger = isValidElement(children)
    ? cloneElement(children as any, {
        onMouseEnter: open,
        onMouseLeave: close,
        onFocus: open,
        onBlur: close,
      })
    : children;

  return (
    <span
      onMouseEnter={open}
      onMouseLeave={close}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {trigger}
      <AnimatePresence>
        {show && (
          <motion.span
            role="tooltip"
            initial={instant ? false : { opacity: 0, ...originVec, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1, ease: [0.4, 0, 1, 1] } }}
            transition={instant ? { duration: 0 } : SPRING}
            style={{
              position: 'absolute',
              ...posStyles,
              transform: `translate(${posStyles.translateX ?? 0}, ${posStyles.translateY ?? 0})`,
              transformOrigin: side === 'top' ? 'center bottom' : side === 'bottom' ? 'center top' : side === 'left' ? 'right center' : 'left center',
              zIndex: 400,
              padding: '5px 10px',
              borderRadius: 8,
              background: 'var(--tooltip-bg, rgba(20, 20, 24, 0.94))',
              color: 'var(--tooltip-fg, #fff)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06) inset',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
