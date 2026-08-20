interface LogoProps {
  variant?: 'primary' | 'inverted' | 'mono' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { text: '18px', slash: '20px' },
  md: { text: '24px', slash: '26px' },
  lg: { text: '36px', slash: '40px' },
};

export default function Logo({ variant, size = 'md' }: LogoProps) {
  const { text: fontSize, slash: slashSize } = sizeMap[size];

  // When variant is explicitly forced (e.g. always-white on a dark panel), use hardcoded colors.
  // Otherwise use CSS variables so the theme transition animates smoothly.
  const forcedText = variant === 'inverted' ? '#0D1B2A' : variant === 'primary' ? '#ffffff' : variant === 'mono' ? '#ffffff' : null;

  if (variant === 'icon') {
    return (
      <span style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize: slashSize, color: '#E8192C', letterSpacing: '-0.02em', lineHeight: 1 }}>
        /
      </span>
    );
  }

  return (
    <span style={{ fontFamily: 'var(--font-mark)', fontWeight: 700, fontSize, letterSpacing: '-0.02em', lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: '1px' }}>
      <span style={{ color: forcedText ?? 'var(--logo-text)' }}>DRENO</span>
      <span style={{ color: '#E8192C', fontSize: slashSize }}>/</span>
    </span>
  );
}
