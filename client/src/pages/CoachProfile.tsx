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
  border: '0.5px solid var(--surface-border)',
  borderRadius: 20,
  padding: '1.5rem',
  marginBottom: '1rem',
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
          <Spinner size={32} />
        </div>
      </Layout>
    );
  }

  if (!coach) {
    return (
      <Layout>
        <div style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem' }}>
          <p style={{ color: 'var(--w60)', fontSize: 14 }}>Coach not found.</p>
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

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '2rem' }}>
          {coach.photo_url ? (
            <img
              src={coach.photo_url}
              alt={name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'var(--w60)',
            }}>
              {name.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
              lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.5rem',
            }}>
              {name}
            </h1>
            {coach.headline && (
              <p style={{ fontSize: 15, color: 'var(--w60)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                {coach.headline}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {coach.is_verified && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 7l3 3 6-6" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('coaches.verified')}
                </span>
              )}
              {rebookStats?.rebook_rate !== null && rebookStats?.rebook_rate !== undefined ? (
                <Tooltip text="Athletes who came back after their first session." position="bottom">
                  <span style={{ fontSize: 12, color: 'var(--w50)', cursor: 'default' }}>
                    {rebookStats.sessions_total} {rebookStats.sessions_total !== 1 ? t('coaches.sessions') : t('coaches.session')} &middot; {rebookStats.rebook_rate}% {t('coaches.rebookRate')}
                  </span>
                </Tooltip>
              ) : rebookStats !== null ? (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 50,
                  background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
                  color: 'var(--w50)',
                }}>
                  {t('coaches.isNew')}
                </span>
              ) : null}
              {coach.hourly_rate && (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--w70)' }}>
                  ${coach.hourly_rate} / {t('common.hour')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sports */}
        {coach.sports?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.5rem' }}>
            {coach.sports.map((s: string) => (
              <span key={s} style={{
                fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 50,
                background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', color: 'var(--w60)',
              }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {coach.bio && (
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.75rem' }}>
              {t('coaches.about')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--w70)', lineHeight: 1.7 }}>{coach.bio}</p>
          </div>
        )}

        {/* Credentials */}
        {(credTypes.length > 0 || (typeof coach.credentials === 'string' && !credObj)) && (
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.75rem' }}>
              {t('coaches.credentials')}
            </p>
            {credTypes.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {credTypes.map((c: string) => (
                  <span key={c} style={{
                    fontSize: 12, padding: '4px 12px', borderRadius: 50,
                    background: 'rgba(255,48,64,0.06)', border: '0.5px solid rgba(255,48,64,0.2)', color: 'var(--w70)',
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--w70)', lineHeight: 1.7 }}>{coach.credentials}</p>
            )}
          </div>
        )}

        {/* Expertise */}
        {coach.expertise_tags?.length > 0 && (
          <div style={{ ...card, marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.75rem' }}>
              {t('coaches.focusAreas')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {coach.expertise_tags.map((tag: string) => (
                <span key={tag} style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 50,
                  background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', color: 'var(--w60)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {coach.linkedin_url && (
          <p style={{ marginBottom: '1.5rem' }}>
            <a
              href={coach.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--w50)', textDecoration: 'underline' }}
            >
              {t('coaches.linkedin')}
            </a>
          </p>
        )}

        <button
          className="btn-primary"
          style={{ fontSize: 16, padding: '16px 0', width: '100%' }}
          onClick={handleBook}
        >
          {t('coaches.bookSession')}
        </button>
      </div>
    </Layout>
  );
}
