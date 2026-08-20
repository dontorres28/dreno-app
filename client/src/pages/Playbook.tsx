import { useEffect, useRef, useState } from 'react';
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

  // Mark seen once animation starts
  useEffect(() => {
    if (!shouldAnimate || markedRef.current) return;
    markedRef.current = true;
    apiPost('/api/playbook/mark-seen', { note_id: note.id }).catch(() => {});
  }, [shouldAnimate, note.id]);

  // Skip on tap or scroll
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
        border: '0.5px solid var(--surface-border)',
        borderRadius: 16,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        cursor: isDone ? 'default' : 'pointer',
      }}
    >
      {/* Coach avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {note.coach_photo ? (
          <img
            src={note.coach_photo}
            alt={note.coach_name ?? ''}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,48,64,0.12)', border: '0.5px solid rgba(255,48,64,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--red)',
          }}>
            {(note.coach_name ?? 'C')[0].toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--w70)' }}>{note.coach_name ?? 'Coach'}</span>
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
            }}
          />
        )}
      </p>

      {/* Timestamp — only after animation completes */}
      <p style={{
        fontSize: 12,
        color: 'var(--w40)',
        opacity: isDone ? 1 : 0,
        transition: 'opacity 0.4s ease',
        marginTop: -4,
      }}>
        {formatDate(note.created_at, note.coach_name)}
      </p>
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
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.75rem, 8vw, 4.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
          }}>
            Playbook
          </h1>
          <p style={{ fontSize: 15, color: 'var(--w50)', lineHeight: 1.6 }}>
            Notes from your coaches. Yours to keep.
          </p>
        </div>

        {/* Section tabs */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '2rem',
          paddingBottom: '1.5rem', borderBottom: '0.5px solid var(--line)',
        }}>
          {SECTIONS.map(s => {
            const hasNotes = sectionsWithNotes.includes(s);
            const isActive = activeSection === s;
            return (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                style={{
                  padding: '7px 16px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                  background: isActive ? 'rgba(255,48,64,0.12)' : 'var(--surface-1)',
                  border: isActive ? '0.5px solid rgba(255,48,64,0.4)' : '0.5px solid var(--surface-border)',
                  color: isActive ? 'var(--white)' : hasNotes ? 'var(--w60)' : 'var(--w30)',
                }}
              >
                {SECTION_LABEL[s]}
                {hasNotes && !isActive && (
                  <span style={{
                    display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--red)', marginLeft: 7, verticalAlign: 'middle', opacity: 0.7,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
            <Spinner size={24} />
          </div>
        )}

        {!loading && sectionNotes.length === 0 && (
          <div style={{
            padding: '3rem 1.5rem', borderRadius: 16, textAlign: 'center',
            border: '0.5px dashed var(--surface-border)',
          }}>
            <p style={{ fontSize: 14, color: 'var(--w40)', lineHeight: 1.7 }}>
              No notes here yet. Your coach can add notes<br />to your Playbook after each session.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sectionNotes.map((note, i) => (
            <CoachNoteCard key={note.id} note={note} isFirst={i === 0} />
          ))}
        </div>

      </div>
    </Layout>
  );
}
