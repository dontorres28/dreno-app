import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import Tooltip from '../components/Tooltip';
import { supabase } from '../lib/supabase';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const card: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '0.5px solid var(--surface-border-2)',
  borderRadius: 20,
  padding: '1.5rem',
  marginBottom: 12,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--w60)', marginBottom: '0.75rem',
};

export default function CoachProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<any>(null);
  const [rebookStats, setRebookStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [{ data, error }] = await Promise.all([
          supabase.from('coaches').select('*, profiles(name, email)').eq('id', id).single(),
          apiGet(`/api/coach/${id}/rebook-stats`).then(d => setRebookStats(d)).catch(() => {}),
        ]);
        if (error) throw error;
        setCoach(data);
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load coach');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}>
          <Spinner size={28} />
        </div>
      </Layout>
    );
  }

  if (!coach) {
    return (
      <Layout>
        <div style={{ maxWidth: 700, margin: '4rem auto', padding: '0 1.5rem' }}>
          <p style={{ color: 'var(--w70)', fontSize: 15 }}>Coach not found.</p>
        </div>
      </Layout>
    );
  }

  const name = coach.profiles?.name ?? 'Coach';
  let credObj: any = null;
  try { credObj = coach.credentials ? JSON.parse(coach.credentials) : null; } catch { /* raw string */ }
  const credTypes: string[] = credObj?.types ?? [];

  function handleBook() {
    if (!user) { navigate('/login'); return; }
    navigate(`/book/${id}`);
  }

  // Consistent chip style — matches athlete pill/tag treatment
  const tagStyle = (highlight = false): React.CSSProperties => ({
    fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 50,
    background: highlight ? 'rgba(255,48,64,0.10)' : 'var(--surface-1)',
    border: highlight ? '0.5px solid rgba(255,48,64,0.28)' : '0.5px solid var(--surface-border-2)',
    color: highlight ? 'var(--red)' : 'var(--w80)',
    letterSpacing: '-0.005em',
  });

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem 8rem' }}>

        {/* Back to coaches */}
        <button
          onClick={() => navigate('/coaches')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--w70)', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 500, padding: '8px 0',
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-body)',
            transition: 'color 220ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--w70)')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Coaches
        </button>

        {/* ── Hero header ── */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(255,48,64,0.08) 0%, rgba(255,48,64,0.02) 100%)',
          border: '0.5px solid var(--surface-border-2)',
          borderRadius: 22, padding: '1.75rem',
          marginBottom: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,48,64,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {coach.photo_url ? (
              <img
                src={coach.photo_url}
                alt={name}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '0.5px solid var(--surface-border-2)' }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #ff5566 0%, #FF3040 60%, #cc1e2c 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 700, color: '#fff',
                fontFamily: 'var(--font-display)', letterSpacing: '-0.03em',
                boxShadow: '0 4px 16px rgba(255,48,64,0.35)',
              }}>
                {name.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.9rem, 5vw, 2.75rem)',
                lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '0.375rem', color: 'var(--white)',
              }}>
                {name}
              </h1>
              {coach.headline && (
                <p style={{ fontSize: 15, color: 'var(--w70)', lineHeight: 1.45 }}>
                  {coach.headline}
                </p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {coach.is_verified && (
              <Tooltip label="Reviewed and approved by Dreno" side="bottom">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
                  padding: '5px 11px', borderRadius: 50,
                  background: 'rgba(255,48,64,0.12)',
                  border: '0.5px solid rgba(255,48,64,0.28)',
                  color: 'var(--red)', cursor: 'help',
                }}>
                  <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                    <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('coaches.verified')}
                </span>
              </Tooltip>
            )}
            {rebookStats?.rebook_rate !== null && rebookStats?.rebook_rate !== undefined ? (
              <Tooltip label="Athletes who came back after their first session" side="bottom">
                <span style={{ fontSize: 12, color: 'var(--w70)', fontWeight: 500, cursor: 'help' }}>
                  {rebookStats.sessions_total} {rebookStats.sessions_total !== 1 ? t('coaches.sessions') : t('coaches.session')} · {rebookStats.rebook_rate}% {t('coaches.rebookRate')}
                </span>
              </Tooltip>
            ) : rebookStats !== null ? (
              <span style={tagStyle()}>
                {t('coaches.isNew')}
              </span>
            ) : null}
            {coach.hourly_rate && (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginLeft: 'auto' }}>
                CHF {coach.hourly_rate}<span style={{ color: 'var(--w60)', fontWeight: 500, marginLeft: 3 }}>/ {t('common.hour')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Sports */}
        {coach.sports?.length > 0 && (
          <div style={card}>
            <p style={sectionLabel}>{t('coaches.sports') ?? 'Sports'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {coach.sports.map((s: string) => (
                <span key={s} style={tagStyle()}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {coach.bio && (
          <div style={card}>
            <p style={sectionLabel}>{t('coaches.about')}</p>
            <p style={{ fontSize: 15, color: 'var(--w80)', lineHeight: 1.65 }}>{coach.bio}</p>
          </div>
        )}

        {/* Focus areas */}
        {coach.expertise_tags?.length > 0 && (
          <div style={card}>
            <p style={sectionLabel}>{t('coaches.focusAreas')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {coach.expertise_tags.map((tag: string) => (
                <span key={tag} style={tagStyle(true)}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Credentials */}
        {(credTypes.length > 0 || (typeof coach.credentials === 'string' && !credObj)) && (
          <div style={card}>
            <p style={sectionLabel}>{t('coaches.credentials')}</p>
            {credTypes.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {credTypes.map((c: string) => (
                  <span key={c} style={tagStyle()}>{c}</span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--w80)', lineHeight: 1.65 }}>{coach.credentials}</p>
            )}
          </div>
        )}

        {/* LinkedIn */}
        {coach.linkedin_url && (
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
            <a
              href={coach.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13, fontWeight: 600, color: 'var(--w70)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 50,
                border: '0.5px solid var(--surface-border-2)',
                background: 'var(--surface-1)',
                textDecoration: 'none',
                transition: 'border-color 200ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms, background 200ms',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--line-2)';
                el.style.color = 'var(--white)';
                el.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--surface-border-2)';
                el.style.color = 'var(--w70)';
                el.style.background = 'var(--surface-1)';
              }}
            >
              {t('coaches.linkedin')}
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M6 3h5v5M11 3L4 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Sticky book CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        padding: '1rem 1.5rem 1.5rem',
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-primary"
            style={{ fontSize: 15, height: 52, width: '100%', padding: '0 32px' }}
            onClick={handleBook}
          >
            {t('coaches.bookSession')}
          </button>
        </div>
      </div>
    </Layout>
  );
}
