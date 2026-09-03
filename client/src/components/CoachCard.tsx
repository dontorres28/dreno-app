import { Link } from 'react-router-dom';

interface Coach {
  id: string;
  headline: string | null;
  hourly_rate: number | null;
  sports: string[];
  expertise_tags: string[];
  photo_url: string | null;
  profiles: { name: string | null } | null;
}

interface Props {
  coach: Coach;
  sportMatch?: boolean;
  matchedTags?: string[];
}

export default function CoachCard({ coach }: Props) {
  const name = coach.profiles?.name ?? 'Coach';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const rate = coach.hourly_rate ? `CHF ${coach.hourly_rate}` : null;
  const primarySport = coach.sports?.[0];

  return (
    <Link
      to={`/coach/${coach.id}`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          background: 'var(--surface-1)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 16,
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: 14,
          transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-hover)';
          el.style.borderColor = 'var(--line-2)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-1)';
          el.style.borderColor = 'var(--surface-border-2)';
        }}
      >
        {/* Photo + name */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {coach.photo_url ? (
            <img src={coach.photo_url} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'var(--w70)', flexShrink: 0,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{name}</p>
            {primarySport && <p style={{ fontSize: 13, color: 'var(--w60)' }}>{primarySport}</p>}
          </div>
        </div>

        {/* Headline */}
        {coach.headline && (
          <p style={{ fontSize: 13.5, color: 'var(--w70)', lineHeight: 1.5 }}>{coach.headline}</p>
        )}

        {/* Price */}
        {rate && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 'auto' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>{rate}</p>
            <span style={{ fontSize: 12, color: 'var(--w60)' }}>/ hour</span>
          </div>
        )}
      </div>
    </Link>
  );
}
