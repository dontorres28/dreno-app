interface Props {
  step: number;      // 0-indexed
  total: number;     // total step count
}

export default function Stepper({ step, total }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      width: '100%', maxWidth: 320, margin: '0 auto',
    }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: done || current ? 'var(--red)' : 'var(--surface-border-2)',
            transition: 'background 0.3s ease',
          }} />
        );
      })}
    </div>
  );
}
