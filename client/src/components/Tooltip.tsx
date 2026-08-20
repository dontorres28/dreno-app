import { useRef, useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { setShow(false); }}
      onTouchStart={() => { holdRef.current = setTimeout(() => setShow(true), 500); }}
      onTouchEnd={() => { if (holdRef.current) clearTimeout(holdRef.current); setShow(false); }}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            ...(position === 'top'
              ? { bottom: 'calc(100% + 8px)' }
              : { top: 'calc(100% + 8px)' }),
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,10,10,0.96)',
            border: '0.5px solid var(--surface-border)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--w80)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.5,
            whiteSpace: 'normal',
            minWidth: 100,
            maxWidth: 210,
            pointerEvents: 'none',
            zIndex: 200,
            textAlign: 'center',
            fontWeight: 400,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
