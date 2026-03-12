import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour persister l'état dans sessionStorage
 * Survit aux changements d'onglets du navigateur
 */
export function useSessionState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize from sessionStorage or default
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return defaultValue;
  });

  // Persist to sessionStorage when state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [key, state]);

  // Listen for external session-state-change events (e.g. from header nav dropdown)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === key) {
        setState(detail.value);
      }
    };
    window.addEventListener('session-state-change', handler);
    return () => window.removeEventListener('session-state-change', handler);
  }, [key]);

  // Wrapper to handle functional updates
  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      return newValue;
    });
  }, []);

  return [state, setPersistedState];
}

/**
 * Hook pour persister un Set dans sessionStorage
 */
export function useSessionSet<T>(
  key: string,
  defaultValue: Set<T> = new Set()
): [Set<T>, (value: Set<T> | ((prev: Set<T>) => Set<T>)) => void] {
  const [array, setArray] = useSessionState<T[]>(key, Array.from(defaultValue));
  
  const set = new Set(array);
  
  const setSet = useCallback((value: Set<T> | ((prev: Set<T>) => Set<T>)) => {
    setArray(prev => {
      const prevSet = new Set(prev);
      const newSet = typeof value === 'function' ? value(prevSet) : value;
      return Array.from(newSet);
    });
  }, [setArray]);
  
  return [set, setSet];
}
