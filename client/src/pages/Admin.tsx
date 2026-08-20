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

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

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
    try {
      await adminPost(`/api/admin/coaches/${id}/verify`, {}, password);
      setCoaches((prev) => prev.map((c) => c.id === id ? { ...c, verified_status: 'verified', rejection_reason: null } : c));
      toast.success('Coach verified');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not verify');
    }
  }

  async function reject(id: string) {
    try {
      await adminPost(`/api/admin/coaches/${id}/reject`, { reason: rejectReason[id] ?? '' }, password);
      setCoaches((prev) => prev.map((c) => c.id === id ? { ...c, verified_status: 'rejected', rejection_reason: rejectReason[id] ?? '' } : c));
      toast.success('Coach rejected');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not reject');
    }
  }

  if (!authed) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-6 py-20">
          <h1 className="text-3xl font-bold mb-8">Admin</h1>
          <form onSubmit={login} className="card flex flex-col gap-4">
            <div>
              <label className="label">Admin password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Spinner size={18} /> : 'Enter'}
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'verified') return '#4ade80';
    if (s === 'rejected') return 'var(--red)';
    return 'var(--w60)';
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Coach verification</h1>
        {coaches.length === 0 ? (
          <p style={{ color: 'var(--w60)' }}>No coaches found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {coaches.map((coach) => (
              <div key={coach.id} className="card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{coach.profiles?.name ?? 'Unnamed'}</p>
                    <p className="text-sm" style={{ color: 'var(--w60)' }}>{coach.profiles?.email}</p>
                    {coach.headline && (
                      <p className="text-sm mt-1" style={{ color: 'var(--w45)' }}>{coach.headline}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: statusColor(coach.verified_status) }}>
                    {coach.verified_status}
                  </span>
                </div>

                {coach.rejection_reason && (
                  <p className="text-sm" style={{ color: 'var(--w60)' }}>
                    Rejection reason: {coach.rejection_reason}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    className="btn-primary text-sm px-4 py-2"
                    onClick={() => verify(coach.id)}
                    disabled={coach.verified_status === 'verified'}
                  >
                    Verify
                  </button>
                  <input
                    className="input flex-1 text-sm py-2"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason[coach.id] ?? ''}
                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [coach.id]: e.target.value }))}
                  />
                  <button
                    className="btn-secondary text-sm px-4 py-2"
                    onClick={() => reject(coach.id)}
                    disabled={coach.verified_status === 'rejected'}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
