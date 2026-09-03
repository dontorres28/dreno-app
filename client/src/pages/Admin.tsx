import { useState } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { adminGet, adminPost } from '../lib/api';
import toast from 'react-hot-toast';

interface Coach {
  id: string;
  headline: string | null;
  verified_status: string;
  rejection_reason: string | null;
  profiles: { name: string | null; email: string | null } | null;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  verified: { label: 'Verified', color: '#fff', bg: 'var(--red)', border: 'var(--red)' },
  rejected: { label: 'Rejected', color: 'var(--w60)', bg: 'transparent', border: 'var(--surface-border-2)' },
  pending:  { label: 'Pending',  color: 'var(--w70)', bg: 'transparent', border: 'var(--surface-border-2)' },
};

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await adminGet('/api/admin/coaches', password);
      setCoaches(data);
      setAuthed(true);
    } catch (err: any) {
      toast.error(err.message ?? 'Wrong password');
    } finally {
      setLoading(false);
    }
  }

  async function verify(id: string) {
    setBusy(id + ':v');
    try {
      await adminPost(`/api/admin/coaches/${id}/verify`, {}, password);
      setCoaches(prev => prev.map(c => c.id === id ? { ...c, verified_status: 'verified', rejection_reason: null } : c));
      toast.success('Coach verified');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not verify');
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id + ':r');
    try {
      await adminPost(`/api/admin/coaches/${id}/reject`, { reason: rejectReason[id] ?? '' }, password);
      setCoaches(prev => prev.map(c => c.id === id ? { ...c, verified_status: 'rejected', rejection_reason: rejectReason[id] ?? '' } : c));
      toast.success('Coach rejected');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not reject');
    } finally {
      setBusy(null);
    }
  }

  if (!authed) {
    return (
      <Layout>
        <div style={{ maxWidth: 400, margin: '5rem auto', padding: '0 1.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 2.75rem)',
            lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 8,
          }}>
            Admin
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w70)', letterSpacing: '-0.005em', marginBottom: '2rem' }}>
            Coach verification portal.
          </p>
          <form
            onSubmit={login}
            style={{
              background: 'var(--surface-1)',
              border: '0.5px solid var(--surface-border-2)',
              borderRadius: 20, padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 8 }}>Admin password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%', padding: '13px 14px', boxSizing: 'border-box',
                  background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)',
                  borderRadius: 12, fontSize: 16, letterSpacing: '-0.005em',
                  color: 'var(--white)', fontFamily: 'var(--font-body)', outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                height: 48, borderRadius: 50, fontSize: 15, fontWeight: 700,
                fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
                background: password ? 'var(--red)' : 'transparent',
                border: password ? '0.5px solid var(--red)' : '0.5px solid var(--surface-border-2)',
                color: password ? '#fff' : 'var(--w60)',
                cursor: password && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
              }}
            >
              {loading ? <Spinner size={16} /> : 'Enter'}
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  const pending = coaches.filter(c => c.verified_status !== 'verified' && c.verified_status !== 'rejected');
  const verified = coaches.filter(c => c.verified_status === 'verified');
  const rejected = coaches.filter(c => c.verified_status === 'rejected');

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)',
            lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 8,
          }}>
            Coach verification
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
            {coaches.length === 0
              ? 'No coach applications yet.'
              : `${pending.length} pending · ${verified.length} verified · ${rejected.length} rejected`}
          </p>
        </div>

        {coaches.length === 0 ? (
          <div style={{
            background: 'var(--surface-1)',
            border: '0.5px solid var(--surface-border-2)',
            borderRadius: 20, padding: '2.5rem 1.5rem', textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: 'var(--w70)', letterSpacing: '-0.005em' }}>
              No coach applications yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {coaches.map(coach => {
              const status = STATUS_META[coach.verified_status] ?? STATUS_META.pending;
              const isVerified = coach.verified_status === 'verified';
              const isRejected = coach.verified_status === 'rejected';
              return (
                <div
                  key={coach.id}
                  style={{
                    background: 'var(--surface-1)',
                    border: '0.5px solid var(--surface-border-2)',
                    borderRadius: 20, padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                        letterSpacing: '-0.02em', marginBottom: 4,
                      }}>
                        {coach.profiles?.name ?? 'Unnamed'}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--w60)', letterSpacing: '-0.005em' }}>
                        {coach.profiles?.email ?? '—'}
                      </p>
                      {coach.headline && (
                        <p style={{ fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em', marginTop: 8, lineHeight: 1.5 }}>
                          {coach.headline}
                        </p>
                      )}
                    </div>
                    <span style={{
                      flexShrink: 0,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: 50,
                      background: status.bg, border: `0.5px solid ${status.border}`,
                      color: status.color,
                    }}>
                      {status.label}
                    </span>
                  </div>

                  {coach.rejection_reason && (
                    <p style={{
                      fontSize: 13, color: 'var(--w70)', letterSpacing: '-0.005em',
                      background: 'var(--surface-2)',
                      borderRadius: 12, padding: '10px 14px', lineHeight: 1.5,
                    }}>
                      <span style={{ color: 'var(--w60)' }}>Reason:</span> {coach.rejection_reason}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      placeholder="Rejection reason (optional)"
                      value={rejectReason[coach.id] ?? ''}
                      onChange={e => setRejectReason(prev => ({ ...prev, [coach.id]: e.target.value }))}
                      style={{
                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                        background: 'var(--surface-2)', border: '0.5px solid var(--surface-border-2)',
                        borderRadius: 12, fontSize: 15, letterSpacing: '-0.005em',
                        color: 'var(--white)', fontFamily: 'var(--font-body)', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => verify(coach.id)}
                        disabled={isVerified || busy === coach.id + ':v'}
                        style={{
                          flex: 1, height: 42, borderRadius: 50, fontSize: 13, fontWeight: 700,
                          fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
                          background: isVerified ? 'transparent' : 'var(--red)',
                          border: isVerified ? '0.5px solid var(--surface-border-2)' : '0.5px solid var(--red)',
                          color: isVerified ? 'var(--w60)' : '#fff',
                          cursor: isVerified ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
                        }}
                      >
                        {busy === coach.id + ':v' ? <Spinner size={14} /> : 'Verify'}
                      </button>
                      <button
                        onClick={() => reject(coach.id)}
                        disabled={isRejected || busy === coach.id + ':r'}
                        style={{
                          flex: 1, height: 42, borderRadius: 50, fontSize: 13, fontWeight: 700,
                          fontFamily: 'var(--font-body)', letterSpacing: '-0.005em',
                          background: 'transparent',
                          border: '0.5px solid var(--surface-border-2)',
                          color: 'var(--w70)',
                          cursor: isRejected ? 'not-allowed' : 'pointer',
                          opacity: isRejected ? 0.5 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms, color 200ms',
                        }}
                      >
                        {busy === coach.id + ':r' ? <Spinner size={14} /> : 'Reject'}
                      </button>
                    </div>
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
