import { useEffect, useState } from 'react';
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

export default function AdminAthletes() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

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
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/org/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${(await import('../lib/supabase')).supabase.auth.getSession().then(r => r.data.session?.access_token)}` },
      });
      toast.success('Removed');
      setMembers(m => m.filter(x => x.id !== memberId));
    } catch {
      toast.error('Could not remove');
    } finally {
      setRemoving(null);
    }
  }

  const active = members.filter(m => m.status === 'active');
  const pending = members.filter(m => m.status === 'pending');

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.25rem 6rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '0.75rem' }}>
            Organization
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em' }}>
            Athletes
          </h1>
        </div>

        {/* Invite form */}
        <form onSubmit={invite} style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', gap: 10,
            background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)',
            borderRadius: 16, padding: '0.75rem',
          }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="athlete@email.com"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--white)',
                padding: '6px 8px',
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={inviting || !email.trim()}
              style={{ fontSize: 13, padding: '10px 20px', flexShrink: 0 }}
            >
              {inviting ? <Spinner size={14} /> : 'Invite'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--w30)', marginTop: 8, paddingLeft: 4 }}>
            If the athlete already has an account, they are added immediately. Otherwise they receive an invite.
          </p>
        </form>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}><Spinner size={24} /></div>
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)' }}>Active</p>
                  <span style={{ fontSize: 12, color: 'var(--w40)' }}>{active.length}</span>
                </div>
                {active.map((m, i) => (
                  <div key={m.id} style={{
                    padding: '0.875rem 1.25rem',
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(52,211,153,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'rgba(52,211,153,0.9)',
                      }}>
                        {m.email[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                        {m.joined_at && (
                          <p style={{ fontSize: 11, color: 'var(--w30)', marginTop: 1 }}>
                            Joined {new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 50, background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.9)' }}>
                        active
                      </span>
                      <button onClick={() => remove(m.id)} disabled={removing === m.id} style={{ fontSize: 12, color: 'var(--w30)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '4px' }}>
                        {removing === m.id ? <Spinner size={12} /> : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending */}
            {pending.length > 0 && (
              <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--surface-border)', borderRadius: 20, overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w40)' }}>Pending invite</p>
                  <span style={{ fontSize: 12, color: 'var(--w40)' }}>{pending.length}</span>
                </div>
                {pending.map((m, i) => (
                  <div key={m.id} style={{
                    padding: '0.875rem 1.25rem',
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--surface-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(251,191,36,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'rgba(251,191,36,0.8)',
                      }}>
                        {m.email[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                        <p style={{ fontSize: 11, color: 'var(--w30)', marginTop: 1 }}>
                          Invited {new Date(m.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 50, background: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.8)' }}>
                        pending
                      </span>
                      <button onClick={() => remove(m.id)} disabled={removing === m.id} style={{ fontSize: 12, color: 'var(--w30)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '4px' }}>
                        {removing === m.id ? <Spinner size={12} /> : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {members.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ fontSize: 14, color: 'var(--w40)', marginBottom: 6 }}>No athletes yet.</p>
                <p style={{ fontSize: 13, color: 'var(--w30)' }}>Invite athletes by email above.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
