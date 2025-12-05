import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook pour persister l'onglet actif dans l'URL
 * Évite la perte d'état quand l'utilisateur navigue entre fenêtres
 */
export function usePersistedTab(defaultTab: string, paramName = 'tab') {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = searchParams.get(paramName) || defaultTab;
  
  const setActiveTab = useCallback((tab: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set(paramName, tab);
      return newParams;
    }, { replace: true });
  }, [setSearchParams, paramName]);
  
  return [activeTab, setActiveTab] as const;
}
