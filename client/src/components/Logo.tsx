interface LogoProps {
  variant?: 'primary' | 'inverted' | 'mono' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

// Real DRENO SPORTS artwork (public/dreno-logo.png), painted as a mask so the
// single transparent asset recolors per theme — navy on light, off-white on
// dark — with no second file. Aspect is locked to the trimmed artwork.
const LOGO_ASPECT = 900 / 198;

const heights = { sm: 18, md: 26, lg: 40 } as const;

export default function Logo({ variant, size = 'md' }: LogoProps) {
  const h = heights[size];
  const color =
    variant === 'inverted' ? '#0A1A2F' :
    variant === 'primary' || variant === 'mono' ? '#EEF4FF' :
    'var(--logo-text)';

  // Icon variant: show just the "DRENO" band cropped square-ish isn't clean
  // from a wordmark, so the icon falls back to the full mark at sm height.
  const height = variant === 'icon' ? heights.sm : h;

  return (
    <span
      role="img"
      aria-label="Dreno Sports"
      style={{
        display: 'inline-block',
        width: height * LOGO_ASPECT,
        height,
        background: color,
        WebkitMaskImage: 'url(/dreno-logo.png)',
        maskImage: 'url(/dreno-logo.png)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        flexShrink: 0,
      }}
    />
  );
}
