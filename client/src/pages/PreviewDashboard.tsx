import type { User, Session } from '@supabase/supabase-js';
import { AuthContext } from '../context/AuthContext';
import Dashboard from './Dashboard';

const MOCK_USER = {
  id: 'preview-athlete',
  email: 'preview@dreno.app',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as User;

const MOCK_SESSION = { access_token: 'preview', user: MOCK_USER } as unknown as Session;

const MOCK_PROFILE = {
  id: 'preview-athlete',
  role: 'athlete' as const,
  name: 'Julián Baumann',
  email: 'preview@dreno.app',
};

export default function PreviewDashboard() {
  return (
    <AuthContext.Provider
      value={{
        user: MOCK_USER,
        session: MOCK_SESSION,
        profile: MOCK_PROFILE,
        loading: false,
        signOut: async () => {},
        refreshProfile: async () => {},
      }}
    >
      <Dashboard />
    </AuthContext.Provider>
  );
}
