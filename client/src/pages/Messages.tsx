import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

interface Thread {
  id: string;
  starts_at: string;
  status: string;
  other_name: string;
  coach_id: string;
  athlete_id: string;
  duration_min: number | null;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

type Tab = 'all' | 'active' | 'past';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function sessionLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` at ${time}`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Deterministic hue from name
function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue = avatarHue(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 30%, 28%)`,
      border: '0.5px solid var(--surface-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 600, color: `hsl(${hue}, 60%, 80%)`,
      letterSpacing: '-0.01em',
    }}>
      {initials(name)}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const isActive = status === 'confirmed';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      padding: '2px 8px', borderRadius: 50,
      background: isActive ? 'rgba(255,48,64,0.10)' : 'var(--surface-border)',
      color: isActive ? 'var(--red)' : 'var(--w40)',
    }}>
      {isActive ? t('messages.active') : t('messages.past')}
    </span>
  );
}

export default function Messages() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [typingDots, setTypingDots] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presenceChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCoach = profile?.role === 'coach';

  useEffect(() => {
    if (!user || !profile) return;
    async function load() {
      const field = profile!.role === 'coach' ? 'coach_id' : 'athlete_id';
      const otherField = profile!.role === 'coach' ? 'athlete_id' : 'coach_id';
      const fkey = otherField === 'coach_id' ? 'bookings_coach_id_fkey' : 'bookings_athlete_id_fkey';

      const { data, error } = await supabase
        .from('bookings')
        .select(`id, starts_at, status, coach_id, athlete_id, duration_min, other:profiles!${fkey}(name)`)
        .eq(field, user!.id)
        .in('status', ['confirmed', 'completed'])
        .order('starts_at', { ascending: false });

      if (error) { toast.error('Could not load conversations'); setLoading(false); return; }

      const mapped: Thread[] = (data ?? []).map((b: any) => ({
        id: b.id, starts_at: b.starts_at, status: b.status,
        coach_id: b.coach_id, athlete_id: b.athlete_id,
        other_name: b.other?.name ?? 'Unknown',
        duration_min: b.duration_min ?? null,
      }));

      setThreads(mapped);
      if (mapped.length > 0) { setActive(mapped[0]); }
      setLoading(false);
    }
    load();
  }, [user, profile]);

  useEffect(() => {
    if (!active) return;
    setMessages([]);

    supabase.from('messages').select('*').eq('thread_id', active.id)
      .order('created_at').then(({ data }) => { setMessages(data ?? []); });

    const ch = supabase.channel(`thread:${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${active.id}` },
        ({ new: m }) => setMessages(p => [...p, m as Message]))
      .subscribe();

    if (presenceChRef.current) presenceChRef.current.unsubscribe();
    const presenceCh = supabase.channel(`typing:${active.id}`);
    presenceChRef.current = presenceCh;
    setOtherTyping(false);

    presenceCh
      .on('presence', { event: 'sync' }, () => {
        const state = presenceCh.presenceState<{ user_id: string; typing: boolean }>();
        const others = Object.values(state).flat().filter((p: { user_id: string; typing: boolean }) => p.user_id !== user?.id);
        setOtherTyping(others.some((p: { user_id: string; typing: boolean }) => p.typing));
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceCh.track({ user_id: user?.id, typing: false });
        }
      });

    return () => { ch.unsubscribe(); presenceCh.unsubscribe(); };
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!otherTyping) { setTypingDots(''); return; }
    const t = setInterval(() => setTypingDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, [otherTyping]);

  function onBodyChange(val: string) {
    setBody(val);
    if (presenceChRef.current && user) {
      presenceChRef.current.track({ user_id: user.id, typing: val.length > 0 });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (val.length > 0) {
        typingTimerRef.current = setTimeout(() => {
          presenceChRef.current?.track({ user_id: user!.id, typing: false });
        }, 2000);
      }
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !active || !body.trim()) return;
    setSending(true);
    const text = body.trim();
    setBody('');
    if (presenceChRef.current) presenceChRef.current.track({ user_id: user.id, typing: false });
    try {
      await supabase.from('messages').insert({ thread_id: active.id, sender_id: user.id, body: text });
    } catch { toast.error('Could not send'); setBody(text); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  const filtered = threads.filter(t => {
    if (tab === 'active') return t.status === 'confirmed';
    if (tab === 'past') return t.status === 'completed';
    return true;
  });

  type Group = { sender_id: string; messages: Message[] };
  const grouped = messages.reduce<Group[]>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last?.sender_id === m.sender_id) { last.messages.push(m); }
    else acc.push({ sender_id: m.sender_id, messages: [m] });
    return acc;
  }, []);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', fontFamily: 'var(--font-body)', color: 'var(--white)', WebkitFontSmoothing: 'antialiased' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div
          className={mobileShowThread ? 'hidden md:flex' : 'flex w-full md:w-[296px]'}
          style={{
            flexShrink: 0, flexDirection: 'column',
            borderRight: '0.5px solid var(--surface-border)',
            background: 'var(--surface-1)',
          }}
        >
          <div style={{ padding: '1.25rem 1rem 0.75rem', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem', paddingLeft: 4 }}>
              {t('messages.title')}
            </p>
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-2)', borderRadius: 10, padding: 3 }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 13, fontWeight: 500,
                    background: tab === t.key ? 'var(--surface-border)' : 'transparent',
                    border: 'none', cursor: 'pointer', color: tab === t.key ? 'var(--white)' : 'var(--w40)',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0.5rem 0.75rem' }}>
            {loading ? (
              <p style={{ fontSize: 13, color: 'var(--w40)', padding: '1rem' }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--w40)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  {tab === 'past'
                    ? 'No past sessions yet.'
                    : isCoach
                      ? t('messages.noThreadsCoach')
                      : t('messages.noThreadsAthlete')}
                </p>
                {!isCoach && tab !== 'past' && (
                  <Link to="/coaches" className="btn-primary" style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none', marginTop: 8 }}>
                    {t('messages.findCoach')}
                  </Link>
                )}
              </div>
            ) : filtered.map(t => {
              const isActive = active?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setActive(t); setMobileShowThread(true); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12,
                    background: isActive ? 'var(--surface-hover)' : 'transparent',
                    border: isActive ? '0.5px solid var(--surface-border)' : '0.5px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.1s', marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Avatar name={t.other_name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: 'var(--white)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.other_name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--w50)', flexShrink: 0, marginLeft: 6 }}>
                        {timeAgo(t.starts_at)}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--w40)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {new Date(t.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {t.duration_min ? ` · ${t.duration_min}min` : ''}
                      {' · '}
                      {t.status === 'completed' ? 'Completed' : 'Confirmed'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Message area ── */}
        {!active ? (
          <div className={mobileShowThread ? 'flex flex-1' : 'hidden md:flex md:flex-1'} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 10.5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="var(--w40)" strokeWidth="1.2"/>
                <path d="M10 7v3.5l2.5 1.5" stroke="var(--w40)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, color: 'var(--w40)' }}>Select a conversation</p>
          </div>
        ) : (
          <div className={mobileShowThread ? 'flex flex-1' : 'hidden md:flex md:flex-1'} style={{ flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{
              padding: '0.875rem 1rem', borderBottom: '0.5px solid var(--surface-border)',
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <button
                className="md:hidden"
                onClick={() => setMobileShowThread(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--w60)', padding: '4px 6px 4px 0', flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}
                aria-label="Back to conversations"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <Avatar name={active.other_name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{active.other_name}</p>
                  <StatusPill status={active.status} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--w40)' }}>
                  {sessionLabel(active.starts_at)}
                  {active.duration_min ? ` · ${active.duration_min} ${t('messages.min')}` : ''}
                </p>
              </div>
              {active.status === 'confirmed' && (
                <a
                  href={`/session/${active.id}`}
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#fff',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--red)', padding: '8px 16px', borderRadius: 50,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="2" width="8" height="9" rx="1.5" stroke="white" strokeWidth="1.2"/>
                    <path d="M9 5l3-2v7l-3-2" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  {t('messages.joinSession')}
                </a>
              )}
            </div>

            {/* Session context card */}
            {messages.length === 0 && (
              <div style={{
                margin: '1.25rem 1.5rem 0',
                padding: '1.25rem',
                background: 'var(--surface-1)',
                border: '0.5px solid var(--surface-border)',
                borderRadius: 16,
                display: 'flex', flexDirection: 'column', gap: '0.875rem',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w50)' }}>
                  {t('messages.sessionInfo')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { label: t('messages.with'), value: active.other_name },
                    { label: t('messages.when'), value: sessionLabel(active.starts_at) },
                    { label: t('messages.duration'), value: active.duration_min ? `${active.duration_min} ${t('messages.min')}` : 'TBD' },
                    { label: t('messages.status'), value: active.status === 'confirmed' ? 'Confirmed' : 'Completed' },
                  ].map(row => (
                    <div key={row.label}>
                      <p style={{ fontSize: 12, color: 'var(--w50)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{row.label}</p>
                      <p style={{ fontSize: 13, color: 'var(--w80)', fontWeight: 500 }}>{row.value}</p>
                    </div>
                  ))}
                </div>
                {active.status === 'confirmed' && (
                  <a href={`/session/${active.id}`} className="btn-primary" style={{
                    fontSize: 13, padding: '8px 18px', textDecoration: 'none',
                    borderTop: '0.5px solid var(--surface-border)', paddingTop: '0.875rem', marginTop: 2,
                    borderRadius: 50, display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="2" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M9 5l3-2v7l-3-2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    Join video session
                  </a>
                )}
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
                  <p style={{ fontSize: 14, color: 'var(--w40)', lineHeight: 1.6 }}>
                    {t('messages.noMessages')}<br />
                    <span style={{ color: 'var(--w50)', fontSize: 13 }}>
                      {t('messages.startConversation')}
                    </span>
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {grouped.map((group, gi) => {
                    const isOwn = group.sender_id === user?.id;
                    return (
                      <div key={gi} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 3 }}>
                        {!isOwn && (
                          <p style={{ fontSize: 12, color: 'var(--w50)', paddingLeft: 4, marginBottom: 2 }}>
                            {active.other_name}
                          </p>
                        )}
                        {group.messages.map((m, mi) => (
                          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              maxWidth: 440,
                              padding: '9px 14px',
                              borderRadius: mi === 0
                                ? isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                                : mi === group.messages.length - 1
                                  ? isOwn ? '4px 18px 18px 18px' : '18px 4px 18px 18px'
                                  : isOwn ? '4px 18px 4px 18px' : '18px 4px 18px 4px',
                              background: isOwn ? 'var(--red)' : 'var(--surface-hover)',
                              fontSize: 14,
                              lineHeight: 1.5,
                              color: 'var(--white)',
                              wordBreak: 'break-word',
                            }}>
                              {m.body}
                            </div>
                            {mi === group.messages.length - 1 && (
                              <p style={{ fontSize: 12, color: 'var(--w50)', marginTop: 4, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                                {msgTime(m.created_at)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {otherTyping && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4, opacity: 0.7 }}>
                      <span style={{ fontSize: 13, color: 'var(--w40)', fontStyle: 'italic' }}>
                        {active.other_name} is typing{typingDots}
                      </span>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={send}
              style={{
                padding: '0.875rem 1.25rem',
                borderTop: '0.5px solid var(--surface-border)',
                display: 'flex', gap: '0.625rem', alignItems: 'center',
                background: 'var(--bg-2)',
              }}
            >
              <input
                ref={inputRef}
                value={body}
                onChange={e => onBodyChange(e.target.value)}
                placeholder={t('messages.messagePlaceholder', { name: active.other_name })}
                style={{
                  flex: 1, background: 'var(--input-bg)', border: '0.5px solid var(--input-border)',
                  borderRadius: 22, padding: '10px 16px', fontSize: 14, color: 'var(--white)',
                  outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus-bdr)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: body.trim() ? 'var(--red)' : 'var(--surface-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
