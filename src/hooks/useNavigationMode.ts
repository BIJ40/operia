import { useState, useCallback } from 'react';

export type NavigationMode = 'header' | 'tabs';

const STORAGE_KEY = 'nav-mode';

export function useNavigationMode() {
  const [mode, setModeState] = useState<NavigationMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'header' || stored === 'tabs') return stored;
    } catch {}
    return 'tabs';
  });

  const setMode = useCallback((next: NavigationMode) => {
    setModeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'header' ? 'tabs' : 'header');
  }, [mode, setMode]);

  return { mode, setMode, toggleMode };
}
