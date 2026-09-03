import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
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

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--surface-1)',
      border: '0.5px solid var(--surface-border-2)',
      borderRadius: 20,
      padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <p className="label" style={{ margin: 0 }}>{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 88, h = 28, pad = 3;
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = max - min || 1;
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((s - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="var(--red)" strokeOpacity="0.7" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export default function CoachAthleteHub() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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
      apiGet(`/api/coach/athletes/${id}`).then(setData).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save note');
    } finally {
      setNoteSaving(false);
    }
  }

  const reactionScores = useMemo(
    () => data ? data.drills.filter(d => d.drill_type === 'reaction_time').map(d => d.composite_score).reverse() : [],
    [data]
  );
  const gonogoScores = useMemo(
    () => data ? data.drills.filter(d => d.drill_type === 'go_no_go').map(d => d.composite_score).reverse() : [],
    [data]
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
          <Spinner size={28} />
        </div>
      </Layout>
    );
  }

  if (err || !data) {
    return (
      <Layout>
        <div style={{ maxWidth: 700, margin: '4rem auto', padding: '0 1.5rem' }}>
          <p style={{ color: 'var(--red)', fontSize: 14 }}>{err || 'Not found'}</p>
        </div>
      </Layout>
    );
  }

  const { profile, athlete, goals, journal, bookings, coachNotes } = data;
  const athleteAge = age(profile.birth_date);
  const sessionsTogether = bookings.filter(b => b.status === 'completed').length;
  const upcomingSession = bookings.find(b => b.status === 'confirmed' && new Date(b.starts_at) > new Date());
  const lastReaction = reactionScores[reactionScores.length - 1];
  const lastGonogo = gonogoScores[gonogoScores.length - 1];

  const metaBits = [
    athleteAge != null ? `${athleteAge} yrs` : null,
    athlete?.sport,
    athlete?.competition_level,
    profile.country,
  ].filter(Boolean) as string[];

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 8rem' }}>

        {/* Back */}
        <Link
          to="/coach/athletes"
          style={{
            fontSize: 13, color: 'var(--w60)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '2rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 7H2M5 4L2 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Roster
        </Link>

        {/* Hero — gradient card with avatar */}
        <div style={{
          position: 'relative',
          borderRadius: 24,
          padding: '2rem 1.75rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(255,48,64,0.14) 0%, rgba(255,48,64,0.04) 60%, transparent 100%)',
          border: '0.5px solid var(--surface-border-2)',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -40, width: 240, height: 240,
            background: 'radial-gradient(circle, rgba(255,48,64,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--surface-2)',
              border: '0.5px solid var(--surface-border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
              letterSpacing: '-0.02em', color: 'var(--white)', flexShrink: 0,
            }}>
              {initials(profile.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 8,
              }}>
                {profile.name}
              </h1>
              {metaBits.length > 0 && (
                <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
                  {metaBits.join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Sessions', value: sessionsTogether },
            { label: 'Goals', value: goals.length },
            { label: 'Journal', value: journal.length },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface-1)',
              border: '0.5px solid var(--surface-border-2)',
              borderRadius: 16, padding: '1rem', textAlign: 'center',
            }}>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
                letterSpacing: '-0.035em', lineHeight: 1, marginBottom: 6,
              }}>
                {s.value}
              </p>
              <p className="label" style={{ margin: 0, fontSize: 11 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Next session — red gradient hero action */}
        {upcomingSession && (
          <div style={{
            position: 'relative',
            borderRadius: 20,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, var(--red) 0%, #d92535 100%)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}>
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 140, height: 140,
              background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}/>
            <div style={{ position: 'relative', minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
                Next session
              </p>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1,
              }}>
                {new Date(upcomingSession.starts_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                {' · '}
                {new Date(upcomingSession.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Link
              to={`/session/${upcomingSession.id}`}
              style={{
                position: 'relative', flexShrink: 0,
                fontSize: 13, fontWeight: 700, color: 'var(--red)',
                background: '#fff', padding: '10px 20px', borderRadius: 50,
                textDecoration: 'none', letterSpacing: '-0.005em',
              }}
            >
              Join
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Cognitive drills */}
          <SectionCard title="Cognitive drills">
            {reactionScores.length === 0 && gonogoScores.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                No drill results yet.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { key: 'reaction_time', label: 'Reaction time', scores: reactionScores, last: lastReaction },
                  { key: 'go_no_go', label: 'Go / No-Go', scores: gonogoScores, last: lastGonogo },
                ].map(d => (
                  <div key={d.key} style={{
                    background: 'var(--surface-2)',
                    borderRadius: 14, padding: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--w60)', marginBottom: 4 }}>{d.label}</p>
                        <p style={{
                          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
                          letterSpacing: '-0.035em', lineHeight: 1,
                        }}>
                          {d.last != null ? Math.round(d.last) : '—'}
                        </p>
                      </div>
                      <MiniSparkline scores={d.scores} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--w60)' }}>{d.scores.length} sessions</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Active goals */}
          <SectionCard title="Active goals">
            {goals.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                No active goals.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {goals.map((g, i) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.875rem 0',
                      borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border-2)',
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--red)', flexShrink: 0,
                    }} />
                    <p style={{ fontSize: 14, flex: 1, letterSpacing: '-0.005em', color: 'var(--w80)' }}>
                      {g.title}
                    </p>
                    {g.target_date && (
                      <p style={{ fontSize: 12, color: 'var(--w60)', flexShrink: 0 }}>
                        {new Date(g.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Shared journal */}
          <SectionCard
            title="Shared journal"
            action={
              journal.length > 0 ? (
                <span style={{ fontSize: 11, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                  {journal.length} {journal.length === 1 ? 'entry' : 'entries'}
                </span>
              ) : undefined
            }
          >
            {journal.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                Nothing shared with you yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {journal.map((e, i) => (
                  <div
                    key={e.id}
                    style={{
                      padding: i === 0 ? '0 0 1rem' : '1rem 0',
                      borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <p style={{ fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                        {new Date(e.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--w60)' }}>
                        {timeAgo(e.created_at)}
                      </p>
                    </div>
                    <p style={{
                      fontSize: 14, lineHeight: 1.7, color: 'var(--w80)',
                      letterSpacing: '-0.005em', whiteSpace: 'pre-wrap',
                    }}>
                      {e.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Session log — coach's private notes */}
          {coachNotes.length > 0 && (
            <SectionCard
              title="Session log"
              action={
                <span style={{ fontSize: 11, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                  {coachNotes.length} {coachNotes.length === 1 ? 'note' : 'notes'}
                </span>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {coachNotes.map(n => (
                  <div key={n.id} style={{
                    background: 'var(--surface-2)',
                    borderRadius: 14, padding: '1rem 1.25rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                        textTransform: 'uppercase', color: 'var(--red)',
                      }}>
                        {n.section}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--w60)' }}>
                        {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 14, lineHeight: 1.7, color: 'var(--w80)',
                      letterSpacing: '-0.005em', whiteSpace: 'pre-wrap',
                    }}>
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Session history */}
          {bookings.length > 0 && (
            <SectionCard title="Session history">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {bookings.map((b, i) => {
                  const done = b.status === 'completed';
                  return (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 0',
                        borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border-2)',
                      }}
                    >
                      <p style={{ fontSize: 13, color: 'var(--w80)', letterSpacing: '-0.005em' }}>
                        {new Date(b.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                        padding: '3px 10px', borderRadius: 50,
                        background: done ? 'transparent' : 'var(--red)',
                        border: done ? '0.5px solid var(--surface-border-2)' : '0.5px solid var(--red)',
                        color: done ? 'var(--w60)' : '#fff',
                      }}>
                        {done ? 'Completed' : 'Confirmed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Sticky composer — add a note to the athlete's playbook */}
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to top, var(--bg) 55%, transparent)',
          padding: '2rem 1rem 1.25rem',
          pointerEvents: 'none', zIndex: 40,
        }}>
          <div style={{
            maxWidth: 700, margin: '0 auto',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 20, padding: '1rem 1rem 0.75rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            pointerEvents: 'auto',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <LayoutGroup id="playbook-sections">
                {PLAYBOOK_SECTIONS.map(s => {
                  const on = noteSection === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setNoteSection(s.key)}
                      style={{
                        position: 'relative',
                        padding: '6px 12px', borderRadius: 50, fontSize: 12,
                        fontWeight: on ? 700 : 500,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        color: on ? '#fff' : 'var(--w70)',
                        fontFamily: 'var(--font-body)',
                        transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                      }}
                    >
                      {on && (
                        <motion.span
                          layoutId="playbook-section-pill"
                          initial={false}
                          transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                          style={{ position: 'absolute', inset: 0, background: 'var(--red)', borderRadius: 50, zIndex: 0 }}
                        />
                      )}
                      <span style={{ position: 'relative', zIndex: 1 }}>{s.label}</span>
                    </button>
                  );
                })}
              </LayoutGroup>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
              <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder={`Note for ${profile.name.split(' ')[0]}'s playbook…`}
                rows={1}
                style={{
                  flex: 1, background: 'var(--surface-2)',
                  border: '0.5px solid var(--surface-border-2)',
                  borderRadius: 14, padding: '10px 14px',
                  fontSize: 15, lineHeight: 1.5, letterSpacing: '-0.005em',
                  color: 'var(--white)', fontFamily: 'var(--font-body)',
                  resize: 'none', outline: 'none', minHeight: 44, maxHeight: 200,
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                }}
              />
              <button
                onClick={saveNote}
                disabled={!noteBody.trim() || noteSaving}
                style={{
                  flexShrink: 0, height: 44, minWidth: 44, padding: '0 18px',
                  borderRadius: 50, fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
                  cursor: noteBody.trim() && !noteSaving ? 'pointer' : 'not-allowed',
                  background: noteBody.trim() ? 'var(--red)' : 'transparent',
                  border: noteBody.trim() ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                  color: noteBody.trim() ? '#fff' : 'var(--w60)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
                }}
              >
                {noteSaving ? <Spinner size={14} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
