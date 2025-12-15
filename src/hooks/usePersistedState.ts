import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook générique pour onglet/état persisté en sessionStorage
 * Persiste tant que l'onglet du navigateur reste ouvert
 */
export function usePersistedTab<T extends string>(
  storageKey: string,
  defaultTab: T,
  validTabs?: T[]
): [T, (tab: T) => void] {
  const getStored = (): T => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      // Valider si la liste des tabs valides est fournie
      if (validTabs && !validTabs.includes(stored as T)) {
        return defaultTab;
      }
      return stored as T;
    }
    return defaultTab;
  };

  const [tab, setTabState] = useState<T>(getStored);

  const setTab = useCallback((newTab: T) => {
    setTabState(newTab);
    sessionStorage.setItem(storageKey, newTab);
  }, [storageKey]);

  return [tab, setTab];
}

/**
 * Hook générique pour filtre persisté en URL Search Params
 * Persiste dans l'URL, survit au refresh et au changement d'onglet navigateur
 */
export function usePersistedFilter(
  paramName: string,
  defaultValue: string
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(paramName) || defaultValue;

  const setValue = useCallback((newValue: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newValue === defaultValue) {
        newParams.delete(paramName); // Nettoyer l'URL si valeur par défaut
      } else {
        newParams.set(paramName, newValue);
      }
      return newParams;
    }, { replace: true }); // replace: true évite d'encombrer l'historique
  }, [paramName, defaultValue, setSearchParams]);

  return [value, setValue];
}

/**
 * Hook pour persister l'état d'ouverture d'une popup/dialog
 * Utilise sessionStorage pour survivre au changement d'onglet navigateur
 */
export function usePersistedDialog(
  storageKey: string
): [boolean, (open: boolean, id?: string | null) => void, string | null] {
  const getStored = (): { open: boolean; id: string | null } => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { open: false, id: null };
      }
    }
    return { open: false, id: null };
  };

  const [state, setState] = useState(getStored);

  const setOpen = useCallback(
    (open: boolean, id?: string | null) => {
      const newState = { open, id: id ?? state.id };
      setState(newState);
      if (open) {
        sessionStorage.setItem(storageKey, JSON.stringify(newState));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    },
    [storageKey, state.id]
  );

  return [state.open, setOpen, state.id];
}

/**
 * Hook pour persister plusieurs filtres en URL
 */
export function usePersistedFilters<T extends Record<string, string>>(
  defaults: T
): [T, (key: keyof T, value: string) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = Object.keys(defaults).reduce((acc, key) => {
    acc[key as keyof T] = (searchParams.get(key) || defaults[key as keyof T]) as T[keyof T];
    return acc;
  }, {} as T);

  const setValue = useCallback((key: keyof T, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === defaults[key]) {
        newParams.delete(key as string);
      } else {
        newParams.set(key as string, value);
      }
      return newParams;
    }, { replace: true });
  }, [defaults, setSearchParams]);

  const resetAll = useCallback(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.keys(defaults).forEach(key => newParams.delete(key));
      return newParams;
    }, { replace: true });
  }, [defaults, setSearchParams]);

  return [values, setValue, resetAll];
}
