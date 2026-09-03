import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main key={pathname} className="flex-1" style={{ animation: 'page-in 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>{children}</main>
    </div>
  );
}
