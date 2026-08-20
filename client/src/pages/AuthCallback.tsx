import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { navigate('/login'); return; }
      const uid = session.user.id;

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single();

      if (profile) {
        const dest = profile.role === 'coach' ? '/coach-dashboard'
          : profile.role === 'administrator' ? '/admin-dashboard'
          : '/dashboard';
        navigate(dest);
        return;
      }

      // New OAuth user — pick up role stored before redirect
      const role = (sessionStorage.getItem('dreno_pending_role') as 'athlete' | 'coach' | 'administrator') ?? 'athlete';
      sessionStorage.removeItem('dreno_pending_role');

      await supabase.from('profiles').insert({ id: uid, role, email: session.user.email });

      if (role === 'athlete') {
        await supabase.from('athletes').insert({ id: uid });
        navigate('/onboarding/athlete');
      } else if (role === 'coach') {
        await supabase.from('coaches').insert({ id: uid });
        navigate('/onboarding/coach');
      } else {
        await supabase.from('administrators').insert({ id: uid });
        navigate('/onboarding/admin');
      }
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Spinner size={32} />
    </div>
  );
}
