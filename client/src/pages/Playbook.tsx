import { useEffect, useRef, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { apiGet, apiPost } from '../lib/api';
import { useTypewriter } from '../hooks/useTypewriter';

interface PlaybookNote {
  id: string;
  section: string;
  body: string;
  created_at: string;
  first_viewed_at: string | null;
  coach_id: string;
  coach_name: string | null;
  coach_photo: string | null;
  eligible_for_animation: boolean;
}

const SECTIONS = ['general', 'focus', 'pre-performance', 'resilience', 'identity', 'recovery'];

const SECTION_LABEL: Record<string, string> = {
  general: 'General',
  focus: 'Focus',
  'pre-performance': 'Pre-performance',
  resilience: 'Resilience',
  identity: 'Identity',
  recovery: 'Recovery',
};

function formatDate(iso: string, coachFirstName: string | null): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const name = coachFirstName ? coachFirstName.split(' ')[0] : 'your coach';
  return `From your session with ${name}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function CoachNoteCard({ note, isFirst }: { note: PlaybookNote; isFirst: boolean }) {
  const shouldAnimate = isFirst && note.first_viewed_at === null && note.eligible_for_animation;
  const { displayText, isDone, skip } = useTypewriter(note.body, shouldAnimate);
  const markedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldAnimate || markedRef.current) return;
    markedRef.current = true;
    apiPost('/api/playbook/mark-seen', { note_id: note.id }).catch(() => {});
  }, [shouldAnimate, note.id]);

  useEffect(() => {
    if (isDone) return;
    const el = cardRef.current;
    if (!el) return;
    const handler = () => skip();
    el.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('scroll', handler, { once: true, passive: true });
    return () => {
      el.removeEventListener('pointerdown', handler);
      window.removeEventListener('scroll', handler);
    };
  }, [isDone, skip]);

  return (
    <div
      ref={cardRef}
      style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--surface-border-2)',
        borderRadius: 18,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        cursor: isDone ? 'default' : 'pointer',
      }}
    >
      {/* Coach avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {note.coach_photo ? (
          <img
            src={note.coach_photo}
            alt={note.coach_name ?? ''}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(255,48,64,0.20) 0%, rgba(255,48,64,0.08) 100%)',
            border: '0.5px solid rgba(255,48,64,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--red)',
            letterSpacing: '-0.02em',
          }}>
            {(note.coach_name ?? 'C')[0].toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{note.coach_name ?? 'Coach'}</span>
          <span style={{ fontSize: 11.5, color: 'var(--w60)', letterSpacing: '0.02em' }}>
            {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Note body */}
      <p style={{
        fontSize: 15,
        lineHeight: 1.7,
        color: 'var(--white)',
        whiteSpace: 'pre-wrap',
        minHeight: '1.5em',
      }}>
        {displayText}
        {!isDone && (
          <span
            style={{
              display: 'inline-block',
              width: 1.5,
              height: '1em',
              background: 'var(--red)',
              marginLeft: 2,
              verticalAlign: 'text-bottom',
              animation: 'caretBlink 0.9s steps(2) infinite',
            }}
          />
        )}
      </p>

      {/* Footnote once done */}
      <p style={{
        fontSize: 12,
        color: 'var(--w60)',
        opacity: isDone ? 1 : 0,
        transition: 'opacity 320ms cubic-bezier(0.23, 1, 0.32, 1)',
        marginTop: -4,
        letterSpacing: '0.01em',
      }}>
        {formatDate(note.created_at, note.coach_name)}
      </p>

      <style>{`@keyframes caretBlink { to { opacity: 0.2; } }`}</style>
    </div>
  );
}

export default function Playbook() {
  const [notes, setNotes] = useState<PlaybookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    apiGet('/api/playbook')
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sectionNotes = notes.filter(n => n.section === activeSection);
  const sectionsWithNotes = SECTIONS.filter(s => notes.some(n => n.section === s));

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 7vw, 4rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            marginBottom: '0.5rem',
          }}>
            Playbook
          </h1>
          <p style={{ fontSize: 15, color: 'var(--w70)', lineHeight: 1.55 }}>
            Notes from your coaches, yours to keep
          </p>
        </div>

        {/* Section tabs — sliding liquid pill */}
        <div style={{
          display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '1.75rem',
          paddingBottom: '1.25rem', borderBottom: '0.5px solid var(--line)',
        }}>
          <LayoutGroup id="playbook-sections">
            {SECTIONS.map(s => {
              const hasNotes = sectionsWithNotes.includes(s);
              const isActive = activeSection === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveSection(s)}
                  style={{
                    position: 'relative',
                    padding: '7px 14px', borderRadius: 50,
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    background: 'transparent', border: 'none',
                    color: isActive ? '#fff' : hasNotes ? 'var(--w80)' : 'var(--w50)',
                    fontFamily: 'var(--font-body)',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="playbook-active-pill"
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
                  <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {SECTION_LABEL[s]}
                    {hasNotes && !isActive && (
                      <span style={{
                        display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--red)',
                      }} />
                    )}
                  </span>
                </button>
              );
            })}
          </LayoutGroup>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
            <Spinner size={24} />
          </div>
        )}

        {!loading && sectionNotes.length === 0 && (
          <div style={{
            padding: '3rem 1.5rem', borderRadius: 16, textAlign: 'center',
            background: 'var(--surface-1)',
            border: '0.5px dashed var(--surface-border-2)',
          }}>
            <p style={{ fontSize: 14, color: 'var(--w70)', lineHeight: 1.65, maxWidth: 320, margin: '0 auto' }}>
              No notes here yet. Your coach can add notes to your Playbook after each session.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sectionNotes.map((note, i) => (
            <CoachNoteCard key={note.id} note={note} isFirst={i === 0} />
          ))}
        </div>

      </div>
    </Layout>
  );
}
