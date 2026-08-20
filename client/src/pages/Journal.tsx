import { useEffect, useRef, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Entry {
  id: string;
  body: string;
  shared_with_coach: boolean;
  created_at: string;
}

interface Block { q?: string; a: string }

interface ParsedBody {
  v?: number;
  m?: number;
  e?: number;
  cat?: string;
  blocks?: Block[];
  plain?: string;
}

const CATEGORIES = {
  post_session: {
    label: 'Post-session',
    prompts: [
      'What did you actually feel out there today, not what you should have felt.',
      'What is the one thing you would do again.',
      'What made you flinch.',
    ],
  },
  pre_session: {
    label: 'Pre-session',
    prompts: [
      'What do you want from today?',
      'What are you carrying in from yesterday?',
      'What does a good session look like right now?',
    ],
  },
  off_day: {
    label: 'Off-day',
    prompts: [
      'What is still in your head from training?',
      'What does your body need today?',
      'What would you tell yourself if tomorrow was a competition?',
    ],
  },
  game_day: {
    label: 'Game day',
    prompts: [
      'What is your one job today?',
      'What are you not going to let bother you?',
      'At the end of today, what would make it a good day?',
    ],
  },
  stuck: {
    label: 'Stuck',
    prompts: [
      'What is actually happening right now?',
      'When did this feeling start?',
      'What would you say to a teammate in the same position?',
    ],
  },
} as const;

type CategoryKey = keyof typeof CATEGORIES;
const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

function isCategoryKey(k: string): k is CategoryKey {
  return k in CATEGORIES;
}

function parseBody(raw: string): ParsedBody {
  try {
    const p = JSON.parse(raw);
    if (p && p.v === 2) return p as ParsedBody;
  } catch {}
  return { plain: raw };
}

function buildBody(blocks: Block[], mood: number, energy: number, cat: string): string {
  return JSON.stringify({ v: 2, m: mood, e: energy, cat, blocks });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function groupEntries(entries: Entry[]) {
  const out: { label: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const label = fmtDate(e.created_at);
    const last = out[out.length - 1];
    if (last?.label === label) last.items.push(e);
    else out.push({ label, items: [e] });
  }
  return out;
}

function computeStreak(entries: Entry[]) {
  const days = new Set(entries.map(e => new Date(e.created_at).toDateString()));
  let s = 0;
  const cur = new Date();
  while (days.has(cur.toDateString())) { s++; cur.setDate(cur.getDate() - 1); }
  return s;
}

function ScaleSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  const [dragging, setDragging] = useState(false);
  const THUMB = 18;

  useEffect(() => {
    if (!trackRef.current) return;
    const ro = new ResizeObserver(e => setTrackW(e[0].contentRect.width));
    ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  function valueFromX(clientX: number): number {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * 9) + 1;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromX(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onChange(valueFromX(e.clientX));
  }
  function onPointerUp() { setDragging(false); }

  const pct = (value - 1) / 9;
  const thumbX = trackW ? pct * (trackW - THUMB) : 0;
  const ease = 'transform 0.25s cubic-bezier(0.4,0,0.2,1)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      <span style={{ fontSize: 12, color: 'var(--w40)', width: 48, flexShrink: 0 }}>{label}</span>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ flex: 1, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', userSelect: 'none', touchAction: 'none' }}
      >
        {/* Track */}
        <div style={{ position: 'absolute', inset: `0 0 0 0`, top: '50%', marginTop: -1.5, height: 3, borderRadius: 2, background: 'var(--surface-border)', overflow: 'hidden' }}>
          {/* Fill — scaleX is GPU composited */}
          <div style={{
            width: '100%', height: '100%', background: 'var(--red)', borderRadius: 2,
            transformOrigin: 'left center',
            transform: `scaleX(${pct})`,
            transition: dragging ? 'none' : ease,
            willChange: 'transform',
          }} />
        </div>
        {/* Thumb — translateX is GPU composited */}
        <div style={{
          position: 'absolute', left: 0, top: '50%', marginTop: -THUMB / 2,
          width: THUMB, height: THUMB, borderRadius: '50%',
          background: 'var(--white)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.28)',
          transform: `translateX(${thumbX}px)`,
          transition: dragging ? 'none' : ease,
          willChange: 'transform',
          pointerEvents: 'none',
        }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, width: 20, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [mode, setMode] = useState<'prompted' | 'freeform'>('prompted');
  const [category, setCategory] = useState<CategoryKey>('post_session');
  const [promptStep, setPromptStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [body, setBody] = useState('');
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [showScales, setShowScales] = useState(false);
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries').select('*').eq('athlete_id', user.id)
      .order('created_at', { ascending: false });
    setEntries(data ?? []);
  }

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    setPromptStep(0);
    setAnswers(['', '', '']);
  }, [category]);

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 100) + 'px';
  }, []);

  async function save() {
    if (!user) return;
    const blocks: Block[] = mode === 'prompted'
      ? CATEGORIES[category].prompts.map((q, i) => ({ q, a: answers[i] })).filter(b => b.a.trim())
      : [{ a: body.trim() }];
    if (!blocks.some(b => b.a)) return;
    const raw = buildBody(blocks, mood, energy, mode === 'prompted' ? category : 'freeform');
    setSaving(true);
    try {
      await supabase.from('journal_entries').insert({ athlete_id: user.id, body: raw, shared_with_coach: shared });
      setAnswers(['', '', '']); setBody(''); setPromptStep(0);
      setShared(false); setMood(5); setEnergy(5); setShowScales(false);
      if (taRef.current) taRef.current.style.height = '100px';
      await load();
    } catch (err: any) { toast.error(err.message ?? 'Could not save'); }
    finally { setSaving(false); }
  }

  async function toggleShare(id: string, current: boolean) {
    await supabase.from('journal_entries').update({ shared_with_coach: !current }).eq('id', id);
    setEntries(p => p.map(e => e.id === id ? { ...e, shared_with_coach: !current } : e));
  }

  const streak = computeStreak(entries);
  const prompts = CATEGORIES[category].prompts;
  const isLastPrompt = promptStep === prompts.length - 1;
  const currentAnswerFilled = answers[promptStep]?.trim().length > 0;
  const canSavePrompted = answers.some(a => a.trim());
  const canSaveFreeform = body.trim().length > 0;
  const groups = groupEntries(entries);

  const onThisDay = entries.find(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    const monthDiff = Math.abs((d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
    return (monthDiff === 1 || monthDiff === 12) && Math.abs(d.getDate() - now.getDate()) <= 2;
  });

  return (
    <Layout>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em' }}>Journal</h1>
          {streak > 0 && (
            <span style={{ fontSize: 12, color: 'var(--w40)', fontWeight: 500 }}>
              {streak} {streak === 1 ? 'day' : 'days'} in a row
            </span>
          )}
        </div>

        {onThisDay && (() => {
          const parsed = parseBody(onThisDay.body);
          const text = parsed.plain ?? (parsed.blocks ?? []).map(b => b.a).join(' ');
          return (
            <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '2.5rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '0.5rem' }}>
                On this day &middot; {new Date(onThisDay.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p style={{ fontSize: 14, color: 'var(--w60)', lineHeight: 1.65 }}>{text.slice(0, 200)}</p>
            </div>
          );
        })()}

        {/* Compose card */}
        <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden', marginBottom: '3.5rem' }}>

          {/* Share toggle — top of card, always visible */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: '0.5px solid var(--surface-1)' }}>
            <span style={{ fontSize: 13, color: shared ? 'var(--w70)' : 'var(--w40)', transition: 'color 0.15s' }}>
              {shared ? 'Your coach will see this entry.' : 'Private. Only you see this.'}
            </span>
            <button type="button" onClick={() => setShared(s => !s)} aria-label="Share with coach" className="toggle-btn"
              style={{ width: 40, height: 23, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, background: shared ? 'rgba(255,48,64,0.65)' : 'var(--surface-border)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
              <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: 3, transform: `translateX(${shared ? 17 : 0}px)`, transition: 'transform 0.2s ease', display: 'block', willChange: 'transform' }} />
            </button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, padding: '0.75rem 1.25rem 0' }}>
            {(['prompted', 'freeform'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 16px', borderRadius: 50, fontSize: 13, fontWeight: 500, background: mode === m ? 'var(--surface-hover)' : 'transparent', border: mode === m ? '0.5px solid var(--surface-border-2)' : '0.5px solid transparent', color: mode === m ? 'var(--white)' : 'var(--w40)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                {m === 'prompted' ? 'Prompted' : 'Freeform'}
              </button>
            ))}
          </div>

          {mode === 'prompted' && (
            <div style={{ padding: '0.875rem 1.25rem 1.25rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
                {CATEGORY_KEYS.map(k => (
                  <button key={k} onClick={() => setCategory(k)} style={{ padding: '4px 13px', borderRadius: 50, fontSize: 12, fontWeight: 500, background: category === k ? 'rgba(255,48,64,0.10)' : 'var(--surface-1)', border: category === k ? '0.5px solid rgba(255,48,64,0.3)' : '0.5px solid var(--surface-border)', color: category === k ? 'var(--white)' : 'var(--w45)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                    {CATEGORIES[k].label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
                {prompts.map((_, i) => (
                  <button key={i} onClick={() => setPromptStep(i)} style={{ width: i === promptStep ? 22 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, background: answers[i]?.trim() ? 'var(--w40)' : i === promptStep ? 'var(--white)' : 'var(--w20)', cursor: 'pointer', transition: 'all 0.25s' }} />
                ))}
              </div>

              <p style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.6, marginBottom: '0.75rem', fontStyle: 'italic' }}>
                {prompts[promptStep]}
              </p>

              <textarea
                autoFocus
                value={answers[promptStep]}
                onChange={e => { const u = [...answers]; u[promptStep] = e.target.value; setAnswers(u); }}
                placeholder="Your answer..."
                style={{ display: 'block', width: '100%', minHeight: 90, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 15, lineHeight: 1.7, color: 'var(--white)', fontFamily: 'var(--font-body)', caretColor: 'var(--red)', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.875rem' }}>
                {promptStep > 0 ? (
                  <button onClick={() => setPromptStep(s => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--w50)', fontSize: 13, fontFamily: 'var(--font-body)', padding: 0 }}>Back</button>
                ) : <span />}
                {isLastPrompt ? (
                  <button onClick={save} disabled={saving || !canSavePrompted} style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 50, background: canSavePrompted ? 'var(--white)' : 'var(--surface-border)', color: canSavePrompted ? '#000' : 'var(--w30)', border: 'none', cursor: canSavePrompted ? 'pointer' : 'default', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                    {saving ? 'Saving...' : 'Save entry'}
                  </button>
                ) : (
                  <button onClick={() => setPromptStep(s => s + 1)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 50, background: currentAnswerFilled ? 'var(--surface-border)' : 'transparent', border: '0.5px solid var(--surface-border)', color: 'var(--w70)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                    Next
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'freeform' && (
            <>
              <textarea ref={taRef} value={body} onChange={e => { setBody(e.target.value); resize(); }} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }} placeholder="What's on your mind."
                style={{ display: 'block', width: '100%', minHeight: 120, background: 'transparent', border: 'none', outline: 'none', resize: 'none', padding: '1.25rem 1.25rem 0.625rem', fontSize: 15, lineHeight: 1.75, color: 'var(--white)', fontFamily: 'var(--font-body)', caretColor: 'var(--red)', boxSizing: 'border-box' }} />
              <div style={{ padding: '0 1.25rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={save} disabled={saving || !canSaveFreeform} style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 50, background: canSaveFreeform ? 'var(--white)' : 'var(--surface-border)', color: canSaveFreeform ? '#000' : 'var(--w30)', border: 'none', cursor: canSaveFreeform ? 'pointer' : 'default', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          )}

          {/* Mood + energy */}
          <div style={{ borderTop: '0.5px solid var(--surface-1)', padding: '0 1.25rem' }}>
            <button onClick={() => setShowScales(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: showScales ? 'var(--w60)' : 'var(--w50)', fontSize: 13, fontFamily: 'var(--font-body)', padding: '0.75rem 0', transition: 'color 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 8s.8 1.5 2.5 1.5S9 8 9 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="4.5" cy="5.5" r="0.75" fill="currentColor"/>
                <circle cx="8.5" cy="5.5" r="0.75" fill="currentColor"/>
              </svg>
              {showScales ? `Mood ${mood}  ·  Energy ${energy}` : 'Add mood + energy'}
            </button>
            <div style={{
              overflow: 'hidden',
              maxHeight: showScales ? '120px' : '0px',
              opacity: showScales ? 1 : 0,
              transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.28s cubic-bezier(0.4,0,0.2,1)',
            }}>
              <div style={{ paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ScaleSlider label="Mood" value={mood} onChange={setMood} />
                <ScaleSlider label="Energy" value={energy} onChange={setEnergy} />
              </div>
            </div>
          </div>
        </div>

        {/* Entry list */}
        {groups.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--w50)' }}>Nothing written yet.</p>
        ) : groups.map(group => (
          <div key={group.label} style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)', marginBottom: '1rem' }}>{group.label}</p>

            {group.items.map((entry, i) => {
              const parsed = parseBody(entry.body);
              const isExpanded = expandedId === entry.id;
              const fullText = parsed.plain ?? (parsed.blocks ?? []).map(b => b.a).join('\n\n');
              const isLong = fullText.length > 280;
              const hasBlocks = !!(parsed.blocks && parsed.blocks[0]?.q);

              return (
                <div key={entry.id} style={{ paddingTop: i === 0 ? 0 : '1.5rem', paddingBottom: '1.5rem', borderBottom: i === group.items.length - 1 ? 'none' : '0.5px solid var(--surface-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 12, color: 'var(--w50)' }}>{fmtTime(entry.created_at)}</p>
                    {parsed.m !== undefined && (
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 50, background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', color: 'var(--w50)', letterSpacing: '0.01em' }}>
                        Mood {parsed.m} &middot; Energy {parsed.e}
                      </span>
                    )}
                    {parsed.cat && parsed.cat !== 'freeform' && isCategoryKey(parsed.cat) && (
                      <span style={{ fontSize: 12, color: 'rgba(255,48,64,0.75)' }}>{CATEGORIES[parsed.cat].label}</span>
                    )}
                  </div>

                  {hasBlocks ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(isExpanded ? parsed.blocks! : [parsed.blocks![0]]).filter(b => b.a).map((block, bi) => (
                        <div key={bi}>
                          <p style={{ fontSize: 12, color: 'var(--w50)', fontStyle: 'italic', marginBottom: '0.25rem', lineHeight: 1.5 }}>{block.q}</p>
                          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--w85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{block.a}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--w85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {isLong && !isExpanded ? fullText.slice(0, 280).trimEnd() + '...' : fullText}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      {(isLong || (parsed.blocks && parsed.blocks.length > 1)) && (
                        <button onClick={() => setExpandedId(isExpanded ? null : entry.id)} style={{ fontSize: 12, color: 'var(--w40)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>
                          {isExpanded ? 'Less' : parsed.blocks && parsed.blocks.length > 1 ? `+${parsed.blocks.length - 1} more` : 'More'}
                        </button>
                      )}
                    </div>
                    <button type="button" onClick={() => toggleShare(entry.id, entry.shared_with_coach)} aria-label="Share with coach" className="toggle-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
                      <span style={{ fontSize: 12, color: entry.shared_with_coach ? 'rgba(255,48,64,0.75)' : 'var(--w50)', transition: 'color 0.2s ease' }}>
                        Share with coach
                      </span>
                      <span style={{ width: 40, height: 23, borderRadius: 12, border: 'none', padding: 0, background: entry.shared_with_coach ? 'rgba(255,48,64,0.65)' : 'var(--surface-border)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0, display: 'inline-block' }}>
                        <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: 3, transform: `translateX(${entry.shared_with_coach ? 17 : 0}px)`, transition: 'transform 0.2s ease', display: 'block', willChange: 'transform' }} />
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Layout>
  );
}
