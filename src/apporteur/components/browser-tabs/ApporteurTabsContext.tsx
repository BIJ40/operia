/**
 * ApporteurTabsContext - Gestion des onglets browser-like pour l'espace Apporteur
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useSearchParams } from 'react-router-dom';
import { 
  ApporteurStoredTabData, 
  ApporteurTabData, 
  ApporteurTabsState, 
  ApporteurModuleDefinition 
} from './types';
import { LayoutDashboard, FolderOpen, FilePlus, BarChart3, User } from 'lucide-react';

// Définition de tous les modules disponibles pour l'espace Apporteur
export const APPORTEUR_MODULES: ApporteurModuleDefinition[] = [
  { id: 'accueil', label: 'Tableau de bord', icon: LayoutDashboard, closable: false },
  { id: 'dossiers', label: 'Dossiers', icon: FolderOpen, closable: false },
  { id: 'demandes', label: 'Demandes', icon: FilePlus, closable: false },
  { id: 'rapport', label: 'Rapport', icon: BarChart3, closable: false },
  { id: 'profil', label: 'Profil', icon: User, closable: false },
];

// Helper pour récupérer un module par ID
function getModuleById(id: string): ApporteurModuleDefinition | undefined {
  return APPORTEUR_MODULES.find(m => m.id === id);
}

// Résoudre les tabs stockés avec leurs icônes
function resolveTabsWithIcons(storedTabs: ApporteurStoredTabData[]): ApporteurTabData[] {
  return storedTabs
    .map(tab => {
      const module = getModuleById(tab.id);
      if (!module) return null;
      return {
        id: tab.id,
        label: module.label,
        icon: module.icon,
        closable: module.closable,
      };
    })
    .filter((tab): tab is ApporteurTabData => tab !== null);
}

// État par défaut : tous les onglets principaux ouverts
const DEFAULT_STATE: ApporteurTabsState = {
  tabs: APPORTEUR_MODULES.map(m => ({ id: m.id, label: m.label, closable: m.closable })),
  activeTabId: 'accueil',
};

interface ApporteurTabsContextValue {
  tabs: ApporteurTabData[];
  activeTabId: string;
  setActiveTab: (tabId: string) => void;
  isTabActive: (tabId: string) => boolean;
}

const ApporteurTabsContext = createContext<ApporteurTabsContextValue | null>(null);

export function ApporteurTabsProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useSessionState<ApporteurTabsState>('apporteur_tabs', DEFAULT_STATE);

  // Résoudre les tabs avec icônes
  const resolvedTabs = useMemo(() => resolveTabsWithIcons(state.tabs), [state.tabs]);

  // Sync active tab avec l'URL
  const activeTabId = searchParams.get('tab') || state.activeTabId || 'accueil';

  const setActiveTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      activeTabId: tabId,
    }));

    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tabId);
      return newParams;
    }, { replace: true });
  }, [setState, setSearchParams]);

  const isTabActive = useCallback((tabId: string) => {
    return activeTabId === tabId;
  }, [activeTabId]);

  const value = useMemo(() => ({
    tabs: resolvedTabs,
    activeTabId,
    setActiveTab,
    isTabActive,
  }), [resolvedTabs, activeTabId, setActiveTab, isTabActive]);

  return (
    <ApporteurTabsContext.Provider value={value}>
      {children}
    </ApporteurTabsContext.Provider>
  );
}

export function useApporteurTabs() {
  const context = useContext(ApporteurTabsContext);
  if (!context) {
    throw new Error('useApporteurTabs must be used within an ApporteurTabsProvider');
  }
  return context;
}
