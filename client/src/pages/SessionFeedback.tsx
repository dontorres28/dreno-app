import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { apiPost, apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SessionFeedback() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [useful, setUseful] = useState<'yes' | 'sort_of' | 'no' | null>(null);
  const [mood, setMood] = useState<number>(6);
  const [moodTouched, setMoodTouched] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    if (!bookingId || !user) return;
    apiGet(`/api/session-feedback/${bookingId}`)
      .then(d => { if (d) setAlreadyDone(true); })
      .catch(() => {});
  }, [bookingId, user]);

  async function submit(skip = false) {
    if (saving) return;
    setSaving(true);
    try {
      if (!skip) {
        await apiPost('/api/session-feedback', {
          booking_id: bookingId,
          useful: useful ?? undefined,
          mood: moodTouched ? mood : undefined,
          admin_note: adminNote.trim() || undefined,
        });
      }
    } catch {
      // silent — don't block navigation on feedback error
    } finally {
      navigate('/dashboard');
    }
  }

  if (alreadyDone) {
    navigate('/dashboard');
    return null;
  }

  const usefulOptions: { value: 'yes' | 'sort_of' | 'no'; label: string }[] = [
    { value: 'yes', label: t('feedback.yes') },
    { value: 'sort_of', label: t('feedback.sortOf') },
    { value: 'no', label: t('feedback.no') },
  ];

  return (
    <Layout>
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        maxWidth: 480, margin: '0 auto',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1.5rem' }}>
          {t('feedback.sessionComplete')}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '3rem', textAlign: 'center' }}>
          {t('feedback.howWasThat')}
        </h1>

        {/* Was this useful */}
        <div style={{ width: '100%', marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--w60)', marginBottom: '0.875rem', letterSpacing: '-0.01em' }}>
            {t('feedback.wasUseful')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
            {usefulOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setUseful(opt.value)}
                style={{
                  padding: '14px 0',
                  borderRadius: 50,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  background: useful === opt.value ? 'var(--red)' : 'var(--surface-1)',
                  border: `0.5px solid ${useful === opt.value ? 'var(--red)' : 'var(--surface-border)'}`,
                  color: useful === opt.value ? '#fff' : 'var(--w80)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mood slider */}
        <div style={{ width: '100%', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--w60)', letterSpacing: '-0.01em' }}>
              {t('feedback.howFeeling')}
            </p>
            {moodTouched && (
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{mood}</p>
            )}
          </div>
          <input
            type="range"
            min={1} max={10} step={1}
            value={mood}
            onChange={e => { setMood(Number(e.target.value)); setMoodTouched(true); }}
            style={{ width: '100%', accentColor: 'var(--red)', cursor: 'pointer', height: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--w50)' }}>{t('feedback.low')}</span>
            <span style={{ fontSize: 12, color: 'var(--w50)' }}>{t('feedback.high')}</span>
          </div>
        </div>

        {/* Admin note (shown without labeling it as a report) */}
        <div style={{ width: '100%', marginBottom: '3rem' }}>
          <input
            type="text"
            className="input"
            placeholder={t('feedback.adminNote')}
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <button
            className="btn-primary"
            style={{ fontSize: 16, padding: '16px' }}
            disabled={saving}
            onClick={() => submit(false)}
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
          <button
            onClick={() => submit(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: 'var(--w40)', fontFamily: 'var(--font-body)', padding: '8px',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </Layout>
  );
}
