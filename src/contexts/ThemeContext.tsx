import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type AppTheme = 'default' | 'zen-nature' | 'zen-blue' | 'sombre';

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_CLASSES: Record<AppTheme, string> = {
  default: '',
  'zen-nature': 'theme-zen-nature',
  'zen-blue': 'theme-zen-blue',
  sombre: 'theme-sombre',
};

const STORAGE_KEY = 'app-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as AppTheme) || 'default';
    } catch {
      return 'default';
    }
  });

  const applyTheme = useCallback((t: AppTheme) => {
    const root = document.documentElement;
    // Remove all theme classes
    Object.values(THEME_CLASSES).forEach(cls => {
      if (cls) root.classList.remove(cls);
    });
    // Also remove .dark that might conflict
    root.classList.remove('dark');
    // Apply new theme class
    const cls = THEME_CLASSES[t];
    if (cls) root.classList.add(cls);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch { /* quota exceeded */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be inside ThemeProvider');
  return ctx;
}
