import React from 'react';

/**
 * Loading placeholder shaped like the content that's coming. Replaces
 * spinners on list-like screens, reads as "content is being drawn"
 * instead of "server is thinking".
 *
 * Uses a single shimmer keyframe defined once, globally, on first mount.
 */

let injected = false;
function inject() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes dreno-skel-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    .dreno-skel {
      background: linear-gradient(
        90deg,
        var(--surface-1) 0%,
        var(--surface-2) 50%,
        var(--surface-1) 100%
      );
      background-size: 200% 100%;
      animation: dreno-skel-shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    @media (prefers-reduced-motion: reduce) {
      .dreno-skel { animation: none; background: var(--surface-1); }
    }
  `;
  document.head.appendChild(s);
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}

export function Skeleton({ width = '100%', height = 16, radius, style, ...rest }: SkeletonProps) {
  if (!injected) inject();
  return (
    <div
      className="dreno-skel"
      aria-hidden
      style={{
        width, height,
        borderRadius: radius,
        ...style,
      }}
      {...rest}
    />
  );
}

/** Rectangular block, e.g. card, section header, media placeholder. */
export function SkeletonBlock({ height = 120, style, ...rest }: SkeletonProps) {
  return <Skeleton height={height} radius={12} style={{ marginBottom: 12, ...style }} {...rest} />;
}

/** Text-line row with a slightly randomized-looking width. */
export function SkeletonLine({ width = '80%', height = 14, style, ...rest }: SkeletonProps) {
  return <Skeleton width={width} height={height} radius={4} style={{ marginBottom: 8, ...style }} {...rest} />;
}

/** A card row that matches the coach-card / dashboard-row shape. */
export function SkeletonCard() {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'center',
      padding: '16px 18px',
      background: 'var(--surface-1)',
      border: '0.5px solid var(--surface-border-2)',
      borderRadius: 18,
      marginBottom: 10,
    }}>
      <Skeleton width={48} height={48} radius={999} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <SkeletonLine width="55%" height={15} />
        <SkeletonLine width="80%" height={12} style={{ marginBottom: 0 }} />
      </div>
    </div>
  );
}

/** Default list-page skeleton, header + a few card rows. Drop-in replacement for a full-page <Spinner />. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <Skeleton width="45%" height={32} radius={6} style={{ marginBottom: 24 }} />
      {Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
