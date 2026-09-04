import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeCtx { theme: Theme; toggle: () => void; }
const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('dreno-theme') as Theme | null;
    if (stored) return stored;
    // Default to light — users can switch to dark if they want.
    return 'light';
  });

  // Apply on first mount only — subsequent changes handled synchronously in toggle()
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') as Theme ?? theme;
    const next: Theme = current === 'dark' ? 'light' : 'dark';

    // Set attribute synchronously so CSS variables change at the same frame the transition starts
    document.documentElement.classList.add('theme-transitioning');
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dreno-theme', next);
    setTheme(next);

    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 420);
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
