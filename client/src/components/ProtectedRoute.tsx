import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'athlete' | 'coach' | 'administrator';
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  // Wait for the initial auth check AND for the profile fetch when a session
  // exists. Otherwise a just-signed-in user renders gated pages with
  // profile=null (role checks silently pass, data hooks read undefined).
  if (loading || (user && !profile)) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role && profile && profile.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
