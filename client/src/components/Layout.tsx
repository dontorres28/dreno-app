import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomTabs from './BottomTabs';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main
        key={pathname}
        className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
        style={{ animation: 'page-in 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
      >
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
