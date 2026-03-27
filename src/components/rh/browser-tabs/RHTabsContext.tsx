/**
 * Context pour la gestion des onglets RH
 * Pattern identique à BrowserTabsContext du module Franchiseur
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, User, Wrench, Briefcase, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RHStoredTabData, RHTabData, RHTabsState } from './types';
import type { CollaboratorType } from '@/types/collaborator';
import type { RHCollaborator } from '@/types/rh-suivi';

// Icônes par type de collaborateur
const TYPE_ICONS: Record<CollaboratorType, LucideIcon> = {
  TECHNICIEN: Wrench,
  ADMINISTRATIF: User,
  DIRIGEANT: Briefcase,
  COMMERCIAL: UserCog,
  AUTRE: User,
};

const DEFAULT_STATE: RHTabsState = {
  tabs: [{ id: 'overview', label: 'Vue d\'ensemble', closable: false }],
  activeTabId: 'overview',
};

// Résoudre les onglets stockés vers les onglets runtime avec icônes
function resolveTabsWithIcons(
  storedTabs: RHStoredTabData[],
  collaboratorsMap: Map<string, RHCollaborator>
): RHTabData[] {
  return storedTabs.map(tab => {
    if (tab.id === 'overview') {
      return {
        ...tab,
        type: 'overview' as const,
        icon: LayoutGrid,
      };
    }
    
    // C'est un onglet collaborateur
    const collaborator = collaboratorsMap.get(tab.id);
    const collaboratorType = collaborator?.type || 'AUTRE';
    
    return {
      ...tab,
      type: 'collaborator' as const,
      collaboratorId: tab.id,
      collaboratorType,
      icon: TYPE_ICONS[collaboratorType],
    };
  });
}

interface RHTabsContextValue {
  tabs: RHTabData[];
  activeTabId: string | null;
  openCollaborator: (collaborator: RHCollaborator) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (newOrder: string[]) => void;
  isTabOpen: (collaboratorId: string) => boolean;
}

const RHTabsContext = createContext<RHTabsContextValue | null>(null);

interface RHTabsProviderProps {
  children: React.ReactNode;
  collaborators: RHCollaborator[];
}

export function RHTabsProvider({ children, collaborators }: RHTabsProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useSessionState<RHTabsState>('rh_suivi_tabs', DEFAULT_STATE);
  
  // Créer une map pour lookup rapide
  const collaboratorsMap = useMemo(() => {
    const map = new Map<string, RHCollaborator>();
    collaborators.forEach(c => map.set(c.id, c));
    return map;
  }, [collaborators]);
  
  // Résoudre les onglets avec icônes
  const resolvedTabs = useMemo(
    () => resolveTabsWithIcons(state.tabs, collaboratorsMap),
    [state.tabs, collaboratorsMap]
  );
  
  // Sync active tab avec URL - utilise 'collab' pour éviter conflit avec onglet global 'tab'
  const urlCollab = searchParams.get('collab');
  const activeTabId = urlCollab || state.activeTabId || 'overview';
  
  const openCollaborator = useCallback((collaborator: RHCollaborator) => {
    const tabId = collaborator.id;
    const fullName = `${collaborator.first_name} ${collaborator.last_name}`;
    
    setState(prev => {
      const existingTab = prev.tabs.find(t => t.id === tabId);
      if (existingTab) {
        // Onglet déjà ouvert, juste l'activer
        return { ...prev, activeTabId: tabId };
      }
      
      const newTab: RHStoredTabData = {
        id: tabId,
        label: fullName,
        closable: true,
      };
      
      return {
        tabs: [...prev.tabs, newTab],
        activeTabId: tabId,
      };
    });
    
    // Update URL avec 'collab' pour éviter conflit avec onglet global
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('collab', tabId);
      return newParams;
    }, { replace: true });
  }, [setState, setSearchParams]);
  
  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const tabIndex = prev.tabs.findIndex(t => t.id === tabId);
      const tab = prev.tabs[tabIndex];
      
      // Cannot close non-closable tabs
      if (!tab?.closable) return prev;
      
      const newTabs = prev.tabs.filter(t => t.id !== tabId);
      
      // If closing active tab, activate the previous one or overview
      let newActiveId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
        if (tabIndex > 0) {
          newActiveId = newTabs[tabIndex - 1]?.id || 'overview';
        } else {
          newActiveId = newTabs[0]?.id || 'overview';
        }
      }
      
      // Sync URL
      setSearchParams(params => {
        const newParams = new URLSearchParams(params);
        if (newActiveId === 'overview') {
          newParams.delete('collab');
        } else {
          newParams.set('collab', newActiveId);
        }
        return newParams;
      }, { replace: true });
      
      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });
  }, [setState, setSearchParams]);
  
  const setActiveTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      activeTabId: tabId,
    }));
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (tabId === 'overview') {
        newParams.delete('collab');
      } else {
        newParams.set('collab', tabId);
      }
      return newParams;
    }, { replace: true });
  }, [setState, setSearchParams]);
  
  const reorderTabs = useCallback((newOrder: string[]) => {
    setState(prev => {
      const reorderedTabs = newOrder
        .map(id => prev.tabs.find(t => t.id === id))
        .filter((t): t is RHStoredTabData => t !== undefined);
      
      return {
        ...prev,
        tabs: reorderedTabs,
      };
    });
  }, [setState]);
  
  const isTabOpen = useCallback((collaboratorId: string) => {
    return state.tabs.some(t => t.id === collaboratorId);
  }, [state.tabs]);
  
  const value = useMemo(() => ({
    tabs: resolvedTabs,
    activeTabId,
    openCollaborator,
    closeTab,
    setActiveTab,
    reorderTabs,
    isTabOpen,
  }), [resolvedTabs, activeTabId, openCollaborator, closeTab, setActiveTab, reorderTabs, isTabOpen]);
  
  return (
    <RHTabsContext.Provider value={value}>
      {children}
    </RHTabsContext.Provider>
  );
}

export function useRHTabs() {
  const context = useContext(RHTabsContext);
  if (!context) {
    throw new Error('useRHTabs must be used within a RHTabsProvider');
  }
  return context;
}
