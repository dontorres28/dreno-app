import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Goal {
  id: string;
  title: string;
  horizon: 'short' | 'mid' | 'long';
  smart_detail: string | null;
  status: string;
  target_date: string | null;
  created_at: string;
}

function defaultDate(horizon: 'short' | 'mid' | 'long') {
  const d = new Date();
  if (horizon === 'short') d.setDate(d.getDate() + 30);
  else if (horizon === 'mid') d.setMonth(d.getMonth() + 4);
  else d.setMonth(d.getMonth() + 11);
  return d.toISOString().slice(0, 10);
}

export default function Goals() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<'short' | 'mid' | 'long' | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);

  const HORIZONS = [
    { key: 'short' as const, label: t('goals.shortTerm'), timeframe: t('goals.shortTimeframe'), accent: 'var(--red)' },
    { key: 'mid' as const, label: t('goals.midTerm'), timeframe: t('goals.midTimeframe'), accent: 'rgba(251,191,36,0.8)' },
    { key: 'long' as const, label: t('goals.longTerm'), timeframe: t('goals.longTimeframe'), accent: 'var(--w40)' },
  ];

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('goals').select('*').eq('athlete_id', user.id)
      .eq('status', 'active').order('created_at', { ascending: true });
    setGoals(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  function openForm(h: 'short' | 'mid' | 'long') {
    setAddingTo(h); setTitle(''); setDetail('');
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !addingTo) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('goals').insert({
        athlete_id: user.id, title: title.trim(),
        horizon: addingTo, smart_detail: detail || null,
        target_date: defaultDate(addingTo),
      });
      if (error) throw error;
      setAddingTo(null); setTitle(''); setDetail('');
      await load();
    } catch (err: any) { toast.error(err.message ?? 'Could not save'); }
    finally { setSaving(false); }
  }

  async function done(id: string) {
    await supabase.from('goals').update({ status: 'archived' }).eq('id', id);
    setGoals(p => p.filter(g => g.id !== id));
  }

  const byHorizon = (h: string) => goals.filter(g => g.horizon === h);

  return (
    <Layout>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
          lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '2.5rem',
        }}>
          {t('goals.title')}
        </h1>

        {!loading && HORIZONS.map(({ key, label, timeframe, accent }) => {
          const list = byHorizon(key);
          const isAdding = addingTo === key;
          return (
            <div key={key} style={{ marginBottom: '2rem' }}>
              {/* Section header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '0.5px solid var(--surface-border)',
                marginBottom: '0.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--w40)' }}>{timeframe}</span>
                </div>
                {!isAdding && (
                  <button
                    onClick={() => openForm(key)}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '5px 14px' }}
                  >
                    {t('goals.addBtn')}
                  </button>
                )}
              </div>

              {/* Goal rows */}
              {list.length === 0 && !isAdding && (
                <p style={{ fontSize: 13, color: 'var(--w50)', padding: '0.875rem 0' }}>{t('goals.nothingYet')}</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {list.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                      padding: '0.875rem 0',
                      borderBottom: '0.5px solid var(--surface-border)',
                    }}
                  >
                    <button
                      onClick={() => done(g.id)}
                      className="toggle-btn"
                      style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                        background: 'transparent', border: '0.5px solid var(--w20)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = accent; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--w20)'; }}
                      title={t('goals.markDone')}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.5 }}>{g.title}</p>
                      {g.smart_detail && (
                        <p style={{ fontSize: 12, color: 'var(--w40)', marginTop: 2, lineHeight: 1.5 }}>{g.smart_detail}</p>
                      )}
                    </div>
                    {g.target_date && (
                      <p style={{ fontSize: 12, color: 'var(--w50)', flexShrink: 0, paddingTop: 3 }}>
                        {new Date(g.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline add form */}
              {isAdding && (
                <form
                  onSubmit={addGoal}
                  style={{
                    marginTop: '0.75rem',
                    background: 'var(--surface-1)',
                    border: '0.5px solid var(--surface-border)',
                    borderRadius: 14,
                    padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  }}
                >
                  <input
                    className="input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={t('goals.goalPlaceholder')}
                    style={{ fontSize: 14 }}
                    autoFocus
                    required
                  />
                  <input
                    className="input"
                    value={detail}
                    onChange={e => setDetail(e.target.value)}
                    placeholder={t('goals.detailPlaceholder')}
                    style={{ fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving || !title.trim()}
                      style={{ fontSize: 13, padding: '9px 22px', opacity: title.trim() ? 1 : 0.4 }}
                    >
                      {saving ? t('goals.saving') : t('goals.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingTo(null)}
                      style={{
                        fontSize: 13, color: 'var(--w40)', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '4px 0',
                      }}
                    >
                      {t('goals.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
