import { Link } from 'react-router-dom';

interface Coach {
  id: string;
  headline: string | null;
  hourly_rate: number | null;
  sports: string[];
  expertise_tags: string[];
  photo_url: string | null;
  profiles: { name: string | null } | null;
  matchScore?: number;
}

interface Props {
  coach: Coach;
  sportMatch?: boolean;
  matchedTags?: string[];
}

export default function CoachCard({ coach, sportMatch, matchedTags = [] }: Props) {
  const name = coach.profiles?.name ?? 'Coach';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const rate = coach.hourly_rate ? `CHF ${coach.hourly_rate}` : null;
  const hasMatch = sportMatch || matchedTags.length > 0;

  return (
    <Link
      to={`/coach/${coach.id}`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          background: 'var(--surface-1)',
          border: hasMatch ? '0.5px solid rgba(255,48,64,0.25)' : '0.5px solid var(--surface-border)',
          borderRadius: 20,
          overflow: 'hidden',
          transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-border)';
          el.style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-1)';
          el.style.transform = 'translateY(0)';
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '0.5px solid var(--surface-border)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          {coach.photo_url ? (
            <img src={coach.photo_url} alt={name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--surface-2)', border: '0.5px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: 'var(--w60)', flexShrink: 0,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>{name}</p>
              {hasMatch && (
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--red)',
                  background: 'rgba(255,48,64,0.10)', border: '0.5px solid rgba(255,48,64,0.25)',
                  borderRadius: 50, padding: '3px 8px',
                }}>
                  Match
                </span>
              )}
            </div>
            {coach.headline && (
              <p style={{ fontSize: 13, color: 'var(--w60)', lineHeight: 1.4, marginTop: 3 }}>{coach.headline}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {coach.sports?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {coach.sports.slice(0, 3).map(s => (
                <span
                  key={s}
                  className={sportMatch ? 'tag tag-red' : 'tag'}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {coach.expertise_tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {coach.expertise_tags.slice(0, 4).map(t => (
                <span key={t} className={matchedTags.includes(t) ? 'tag tag-red' : 'tag'}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '0.5px solid var(--surface-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {rate ? (
            <p style={{ fontSize: 14, fontWeight: 600 }}>
              {rate}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--w40)', marginLeft: 4 }}>/hr</span>
            </p>
          ) : <span />}
          <span className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
            View profile
          </span>
        </div>
      </div>
    </Link>
  );
}
