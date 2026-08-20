import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { apiGet, apiPost } from '../lib/api';
import toast from 'react-hot-toast';

const PLAYBOOK_SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'focus', label: 'Focus' },
  { key: 'pre-performance', label: 'Pre-performance' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'identity', label: 'Identity' },
  { key: 'recovery', label: 'Recovery' },
];

interface AthleteData {
  profile: {
    id: string; name: string; country?: string;
    languages?: string[]; birth_date?: string;
  };
  athlete: {
    sport: string; competition_level: string;
    timezone: string; session_format_pref: string;
  };
  goals: { id: string; title: string; horizon: string; target_date: string | null }[];
  journal: { id: string; body: string; created_at: string }[];
  drills: { drill_type: string; composite_score: number; completed_at: string }[];
  bookings: { id: string; starts_at: string; status: string }[];
  coachNotes: { id: string; section: string; body: string; created_at: string }[];
}

function age(birth_date?: string): number | null {
  if (!birth_date) return null;
  return Math.floor((Date.now() - new Date(birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function MiniSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 80, h = 28, pad = 3;
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = max - min || 1;
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((s - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="rgba(255,48,64,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

const HORIZON_COLOR: Record<string, string> = {
  short: 'var(--red)',
  mid: 'rgba(251,191,36,0.8)',
  long: 'rgba(52,211,153,0.7)',
};

export default function CoachAthleteHub() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Playbook note form
  const [noteBody, setNoteBody] = useState('');
  const [noteSection, setNoteSection] = useState('general');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet(`/api/coach/athletes/${id}`)
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveNote() {
    if (!id || !noteBody.trim()) return;
    setNoteSaving(true);
    try {
      await apiPost('/api/coach/playbook/note', { athlete_id: id, section: noteSection, body: noteBody.trim() });
      toast.success('Note saved');
      setNoteBody('');
      // Refresh to show new note
      apiGet(`/api/coach/athletes/${id}`).then(setData).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save note');
    } finally {
      setNoteSaving(false);
    }
  }

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}><Spinner size={28} /></div></Layout>;
  if (err || !data) return <Layout><div style={{ maxWidth: 600, margin: '4rem auto', padding: '0 1.5rem' }}><p style={{ color: 'var(--red)', fontSize: 14 }}>{err || 'Not found'}</p></div></Layout>;

  const { profile, athlete, goals, journal, drills, bookings, coachNotes } = data;
  const athleteAge = age(profile.birth_date);
  const recentSessions = bookings.filter(b => b.status === 'completed').length;
  const upcomingSession = bookings.find(b => b.status === 'confirmed' && new Date(b.starts_at) > new Date());

  const reactionScores = drills.filter(d => d.drill_type === 'reaction_time').map(d => d.composite_score).reverse();
  const gonogoScores = drills.filter(d => d.drill_type === 'go_no_go').map(d => d.composite_score).reverse();

  const lastReaction = reactionScores[reactionScores.length - 1];
  const lastGonogo = gonogoScores[gonogoScores.length - 1];

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Back */}
        <Link to="/coach/athletes" style={{ fontSize: 13, color: 'var(--w40)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '2rem' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 7H2M5 4L2 7l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Athletes
        </Link>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '3rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
            {(profile.name ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 2.75rem)', lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              {profile.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {athleteAge && <span style={{ fontSize: 13, color: 'var(--w60)' }}>{athleteAge} years old</span>}
              {athlete?.sport && <><span style={{ color: 'var(--w20)' }}>·</span><span style={{ fontSize: 13, color: 'var(--w60)' }}>{athlete.sport}</span></>}
              {athlete?.competition_level && <><span style={{ color: 'var(--w20)' }}>·</span><span style={{ fontSize: 13, color: 'var(--w60)' }}>{athlete.competition_level}</span></>}
              {profile.country && <><span style={{ color: 'var(--w20)' }}>·</span><span style={{ fontSize: 13, color: 'var(--w60)' }}>{profile.country}</span></>}
              {profile.languages && profile.languages.length > 0 && (
                <><span style={{ color: 'var(--w20)' }}>·</span><span style={{ fontSize: 13, color: 'var(--w60)' }}>{profile.languages.join(', ')}</span></>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Sessions together', value: recentSessions },
            { label: 'Active goals', value: goals.length },
            { label: 'Drills completed', value: drills.length },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-1)', borderRadius: 16, padding: '1.25rem 1rem', textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--w50)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Next session banner */}
        {upcomingSession && (
          <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(255,48,64,0.07)', border: '0.5px solid rgba(255,48,64,0.18)', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--w60)', marginBottom: 3 }}>Next session</p>
              <p style={{ fontSize: 15, fontWeight: 600 }}>
                {new Date(upcomingSession.starts_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                {' at '}
                {new Date(upcomingSession.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Link to={`/session/${upcomingSession.id}`} className="btn-primary" style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}>Join</Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Cognitive drills */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>Cognitive drills</p>
            {drills.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--w40)' }}>No drill results yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { key: 'reaction_time', label: 'Reaction time', scores: reactionScores, last: lastReaction },
                  { key: 'go_no_go', label: 'Go / No-Go', scores: gonogoScores, last: lastGonogo },
                ].map(d => (
                  <div key={d.key} style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-1)', borderRadius: 16, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--w40)', marginBottom: 4 }}>{d.label}</p>
                        <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>
                          {d.last != null ? Math.round(d.last) : '--'}
                        </p>
                      </div>
                      <MiniSparkline scores={d.scores} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--w50)' }}>{d.scores.length} sessions</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Goals */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>Active goals</p>
            {goals.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--w40)' }}>No active goals.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {goals.map((g, i) => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 0', borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: HORIZON_COLOR[g.horizon] ?? 'var(--w40)', flexShrink: 0 }} />
                    <p style={{ fontSize: 14, flex: 1 }}>{g.title}</p>
                    {g.target_date && (
                      <p style={{ fontSize: 12, color: 'var(--w40)', flexShrink: 0 }}>
                        {new Date(g.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Shared journal */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>Shared journal</p>
            {journal.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--w40)' }}>No entries shared with you yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {journal.map(e => (
                  <div key={e.id}>
                    <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: '0.4rem' }}>
                      {new Date(e.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' '}
                      {new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--w80)', whiteSpace: 'pre-wrap' }}>{e.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Session log — coach notes */}
          {coachNotes.length > 0 && (
            <section>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>Session log</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {coachNotes.map(n => (
                  <div key={n.id} style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 14, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--red)', opacity: 0.7 }}>{n.section}</span>
                      <span style={{ fontSize: 11, color: 'var(--w40)' }}>
                        {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--w80)', whiteSpace: 'pre-wrap' }}>{n.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Playbook notes */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>Add note</p>
            <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PLAYBOOK_SECTIONS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setNoteSection(s.key)}
                    style={{
                      padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      background: noteSection === s.key ? 'rgba(255,48,64,0.12)' : 'var(--bg)',
                      border: noteSection === s.key ? '0.5px solid rgba(255,48,64,0.4)' : '0.5px solid var(--surface-border)',
                      color: noteSection === s.key ? 'var(--white)' : 'var(--w50)',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Write a note for this athlete's Playbook..."
                rows={4}
                style={{
                  width: '100%', background: 'var(--bg)', border: '0.5px solid var(--surface-border)',
                  borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7,
                  color: 'var(--white)', fontFamily: 'var(--font-body)', resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={saveNote}
                disabled={!noteBody.trim() || noteSaving}
                style={{
                  alignSelf: 'flex-end', padding: '9px 22px', borderRadius: 50, fontSize: 13,
                  fontWeight: 600, fontFamily: 'var(--font-body)', cursor: noteBody.trim() ? 'pointer' : 'not-allowed',
                  background: noteBody.trim() ? 'rgba(255,48,64,0.12)' : 'var(--bg)',
                  border: noteBody.trim() ? '0.5px solid rgba(255,48,64,0.4)' : '0.5px solid var(--surface-border)',
                  color: noteBody.trim() ? 'var(--white)' : 'var(--w30)',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {noteSaving ? <Spinner size={13} /> : 'Save to Playbook'}
              </button>
            </div>
          </section>

          {/* Session history */}
          {bookings.length > 0 && (
            <section>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>Session history</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {bookings.map((b, i) => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--w60)' }}>
                      {new Date(b.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 50, background: b.status === 'completed' ? 'rgba(52,211,153,0.1)' : b.status === 'confirmed' ? 'rgba(255,48,64,0.1)' : 'var(--surface-border)', color: b.status === 'completed' ? 'rgba(52,211,153,0.8)' : b.status === 'confirmed' ? 'var(--red)' : 'var(--w40)' }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}
