import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, LayoutGroup } from 'framer-motion';
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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 44,
          lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: '1.75rem',
        }}>
          Coaches
        </h1>

        {/* Filters — sliding pill with liquid feel */}
        {allSports.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: '1.75rem' }}>
            <LayoutGroup id="sport-filters">
              {[''].concat(allSports).map((s) => {
                const active = sportFilter === s;
                const label = s === '' ? 'All' : s;
                return (
                  <button
                    key={s || 'all'}
                    onClick={() => setSportFilter(s)}
                    style={{
                      position: 'relative',
                      fontSize: 13, fontWeight: active ? 700 : 500, padding: '7px 14px', borderRadius: 50,
                      border: 'none', background: 'transparent',
                      color: active ? '#fff' : 'var(--w70)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    {active && (
                      <motion.span
                        layoutId="sport-active-pill"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'var(--red)',
                          borderRadius: 50,
                          zIndex: 0,
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
                  </button>
                );
              })}
            </LayoutGroup>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--w60)', paddingTop: '2rem' }}>No coaches yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
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
