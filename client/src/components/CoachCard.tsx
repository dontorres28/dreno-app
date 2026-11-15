import { Link } from 'react-router-dom';
import { CaretRight, SealCheck } from '@phosphor-icons/react';

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

export default function CoachCard({ coach, sportMatch, matchedTags = [] }: Props) {
  const name = coach.profiles?.name ?? 'Coach';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const rate = coach.hourly_rate ? `CHF ${coach.hourly_rate}` : null;
  const primarySport = coach.sports?.[0];
  const matched = sportMatch || matchedTags.length > 0;

  return (
    <Link to={`/coach/${coach.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div
        className="squircle"
        style={{
          background: 'var(--surface-1)',
          border: `0.5px solid ${matched ? 'rgba(77,166,255,0.38)' : 'var(--surface-border-2)'}`,
          borderRadius: 20,
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: 13,
          transition: 'background 0.2s, border-color 0.2s, transform 0.18s cubic-bezier(0.23,1,0.32,1)',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--surface-hover)'; el.style.borderColor = matched ? 'rgba(77,166,255,0.6)' : 'var(--line-2)'; el.style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--surface-1)'; el.style.borderColor = matched ? 'rgba(77,166,255,0.38)' : 'var(--surface-border-2)'; el.style.transform = 'translateY(0)'; }}
      >
        {/* Photo + name */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {coach.photo_url ? (
            <img src={coach.photo_url} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '0.5px solid var(--surface-border-2)' }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'var(--w70)', flexShrink: 0,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--white)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            {primarySport && <p style={{ fontSize: 13, color: 'var(--w60)' }}>{primarySport}</p>}
          </div>
          <CaretRight size={16} weight="bold" color="var(--w40)" style={{ flexShrink: 0 }} />
        </div>

        {/* Match badge, surfaces the sort that already happened */}
        {matched && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 50, background: 'rgba(77,166,255,0.14)', border: '0.5px solid rgba(77,166,255,0.3)' }}>
            <SealCheck size={13} weight="fill" color="var(--accent)" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-strong)', letterSpacing: '0.01em' }}>
              {sportMatch ? 'Plays your sport' : 'Good match for you'}
            </span>
          </div>
        )}

        {coach.headline && (
          <p style={{ fontSize: 13.5, color: 'var(--w70)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{coach.headline}</p>
        )}

        {rate && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 'auto' }}>
            <p style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--white)' }}>{rate}</p>
            <span style={{ fontSize: 12, color: 'var(--w60)' }}>/ hour</span>
          </div>
        )}
      </div>
    </Link>
  );
}
