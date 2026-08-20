import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import CoachCard from '../components/CoachCard';
import Spinner from '../components/Spinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Coaches() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('');
  const [athleteSport, setAthleteSport] = useState('');
  const [athleteChallenges, setAthleteChallenges] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: coachData, error } = await supabase
          .from('coaches')
          .select('*, profiles(name)')
          .eq('verified_status', 'verified');
        if (error) throw error;

        if (user) {
          const { data: ath } = await supabase
            .from('athletes')
            .select('sport')
            .eq('id', user.id)
            .single();
          if (ath?.sport) setAthleteSport(ath.sport);

          const { data: chals } = await supabase
            .from('athlete_challenges')
            .select('challenge_tag')
            .eq('athlete_id', user.id);
          if (chals) setAthleteChallenges(chals.map((c: any) => c.challenge_tag));
        }

        setCoaches(coachData ?? []);
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load coaches');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function computeMatch(coach: any): { score: number; sportMatch: boolean; matchedTags: string[] } {
    if (!user) return { score: 0, sportMatch: false, matchedTags: [] };
    const coachSports = (coach.sports ?? []).map((s: string) => s.toLowerCase());
    const sportMatch = !!(athleteSport && coachSports.includes(athleteSport.toLowerCase()));
    const matchedTags: string[] = [];
    for (const tag of (coach.expertise_tags ?? [])) {
      if (athleteChallenges.some(c => tag.toLowerCase().includes(c.toLowerCase().split(' ')[0]))) {
        matchedTags.push(tag);
      }
    }
    const score = (sportMatch ? 5 : 0) + matchedTags.length * 2;
    return { score, sportMatch, matchedTags };
  }

  const allSports = Array.from(
    new Set(coaches.flatMap((c) => c.sports ?? []))
  ).sort();

  const filtered = coaches
    .filter((c) => !sportFilter || (c.sports ?? []).includes(sportFilter))
    .map((c) => ({ ...c, ...computeMatch(c) }))
    .sort((a, b) => b.score - a.score);

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
          lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.75rem',
        }}>
          {t('coaches.title')}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--w60)', marginBottom: '2rem' }}>
          {t('coaches.subtitle')}
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '2rem' }}>
          <button
            className="toggle-btn"
            onClick={() => setSportFilter('')}
            style={{
              fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 50,
              border: !sportFilter ? '1px solid var(--red)' : '0.5px solid var(--surface-border)',
              color: !sportFilter ? 'var(--white)' : 'var(--w60)',
              background: !sportFilter ? 'rgba(255,48,64,0.10)' : 'transparent',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'color 0.15s, border-color 0.15s, background 0.15s',
            }}
          >
            {t('coaches.allSports')}
          </button>
          {allSports.map((s) => (
            <button
              key={s}
              className="toggle-btn"
              onClick={() => setSportFilter(s)}
              style={{
                fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 50,
                border: sportFilter === s ? '1px solid var(--red)' : '0.5px solid var(--surface-border)',
                color: sportFilter === s ? 'var(--white)' : 'var(--w60)',
                background: sportFilter === s ? 'rgba(255,48,64,0.10)' : 'transparent',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'color 0.15s, border-color 0.15s, background 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--w60)' }}>{t('coaches.noResults')}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                sportMatch={coach.sportMatch}
                matchedTags={coach.matchedTags}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
