import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main key={pathname} className="flex-1" style={{ animation: 'page-in 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>{children}</main>
      <footer className="px-4 py-6 md:px-8 md:py-10" style={{ borderTop: '0.5px solid var(--line)' }}>
        <div className="max-w-6xl mx-auto">
          <p style={{ fontSize: 13, color: 'var(--w40)' }}>
            Dreno is not therapy or medical care. If you are in crisis, contact local emergency services.
          </p>
        </div>
      </footer>
    </div>
  );
}
