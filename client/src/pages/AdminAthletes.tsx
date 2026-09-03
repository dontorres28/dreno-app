import { useEffect, useMemo, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { apiGet, apiPost } from '../lib/api';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  email: string;
  status: 'pending' | 'active';
  athlete_id: string | null;
  invited_at: string;
  joined_at: string | null;
}

type Filter = 'all' | 'active' | 'pending';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
];

function relDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminAthletes() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  async function load() {
    try {
      const data = await apiGet('/api/org/overview');
      setMembers(data.members ?? []);
    } catch (err: any) {
      toast.error(err.message ?? 'Could not load athletes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const data = await apiPost('/api/org/invite', { email: email.trim() });
      toast.success(data.already_registered ? `${email} added` : `Invite sent to ${email}`);
      setEmail('');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Could not invite');
    } finally {
      setInviting(false);
    }
  }

  async function remove(memberId: string) {
    setRemoving(memberId);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/org/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      toast.success('Removed');
      setMembers(m => m.filter(x => x.id !== memberId));
    } catch {
      toast.error('Could not remove');
    } finally {
      setRemoving(null);
    }
  }

  const activeCount = useMemo(() => members.filter(m => m.status === 'active').length, [members]);
  const pendingCount = useMemo(() => members.filter(m => m.status === 'pending').length, [members]);

  const filtered = useMemo(() => {
    if (filter === 'active') return members.filter(m => m.status === 'active');
    if (filter === 'pending') return members.filter(m => m.status === 'pending');
    return members;
  }, [members, filter]);

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)',
            lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 8,
          }}>
            My athletes
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
            {members.length === 0
              ? 'Invite your first athlete below.'
              : `${members.length} total · ${activeCount} active · ${pendingCount} pending`}
          </p>
        </div>

        {/* Invite composer */}
        <form onSubmit={invite} style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border-2)',
            borderRadius: 16, padding: '0.5rem 0.5rem 0.5rem 1rem',
          }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="athlete@email.com"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 15, letterSpacing: '-0.005em', lineHeight: 1.4,
                fontFamily: 'var(--font-body)', color: 'var(--white)',
                padding: '8px 0',
              }}
            />
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              style={{
                flexShrink: 0, height: 40, padding: '0 20px', borderRadius: 50,
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em',
                fontFamily: 'var(--font-body)',
                cursor: email.trim() && !inviting ? 'pointer' : 'not-allowed',
                background: email.trim() ? 'var(--red)' : 'transparent',
                border: email.trim() ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                color: email.trim() ? '#fff' : 'var(--w60)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
              }}
            >
              {inviting ? <Spinner size={14} /> : 'Invite'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--w60)', marginTop: 8, paddingLeft: 4, letterSpacing: '-0.005em' }}>
            If the athlete already has a Dreno account, they are added immediately. Otherwise they receive an invite by email.
          </p>
        </form>

        {/* Filter pills */}
        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem' }}>
            <LayoutGroup id="admin-athlete-filter">
              {FILTERS.map(f => {
                const on = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      position: 'relative',
                      fontSize: 13, fontWeight: on ? 700 : 500,
                      padding: '8px 16px', borderRadius: 50,
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: on ? '#fff' : 'var(--w70)',
                      fontFamily: 'var(--font-body)',
                      transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    {on && (
                      <motion.span
                        layoutId="admin-athlete-filter-pill"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                        style={{ position: 'absolute', inset: 0, background: 'var(--red)', borderRadius: 50, zIndex: 0 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
                  </button>
                );
              })}
            </LayoutGroup>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
            <Spinner size={24} />
          </div>
        ) : members.length === 0 ? (
          <div style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 20, padding: '2.5rem 1.5rem', textAlign: 'center',
          }}>
            <p style={{ fontSize: 15, color: 'var(--w80)', letterSpacing: '-0.005em', marginBottom: 6 }}>
              No athletes yet.
            </p>
            <p style={{ fontSize: 13, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
              Invite your first athlete by email above.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--w60)', paddingLeft: 4 }}>
            None in this bucket.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {filtered.map(m => {
              const isActive = m.status === 'active';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: 'var(--surface-1)',
                    border: '0.5px solid var(--surface-border-2)',
                    borderRadius: 18,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--surface-2)',
                    border: '0.5px solid var(--surface-border-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                    letterSpacing: '-0.02em', color: 'var(--white)',
                  }}>
                    {m.email[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
                      color: 'var(--white)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: 2,
                    }}>
                      {m.email}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                      {isActive && m.joined_at
                        ? `Joined ${relDate(m.joined_at)}`
                        : `Invited ${relDate(m.invited_at)}`}
                    </p>
                  </div>

                  {/* Status pill + remove */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '3px 9px', borderRadius: 50,
                      background: isActive ? 'var(--red)' : 'transparent',
                      border: isActive ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                      color: isActive ? '#fff' : 'var(--w60)',
                    }}>
                      {isActive ? 'Active' : 'Pending'}
                    </span>
                    <button
                      onClick={() => remove(m.id)}
                      disabled={removing === m.id}
                      style={{
                        fontSize: 12, color: 'var(--w60)', letterSpacing: '-0.005em',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-body)', padding: '4px 2px',
                      }}
                    >
                      {removing === m.id ? <Spinner size={12} /> : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
