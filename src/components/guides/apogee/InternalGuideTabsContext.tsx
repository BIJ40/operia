/**
 * InternalGuideTabsContext - Gestion des onglets navigateur pour le Guide Apogée interne
 * Similaire à PublicGuideTabsContext mais pour les utilisateurs connectés
 */

import React, { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import { LucideIcon, Home } from 'lucide-react';

// Type stocké en sessionStorage (sans icône)
export interface StoredGuideTab {
  id: string;
  label: string;
  closable: boolean;
}

// Type runtime avec icône résolue
export interface InternalGuideTab {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
}

interface InternalGuideTabsState {
  tabs: StoredGuideTab[];
  activeTabId: string;
}

interface InternalGuideTabsContextValue {
  tabs: InternalGuideTab[];
  activeTabId: string;
  openTab: (id: string, label: string, icon?: LucideIcon) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (newOrder: string[]) => void;
  isTabOpen: (id: string) => boolean;
}

const STORAGE_KEY = 'internal_apogee_guide_tabs';

const DEFAULT_STATE: InternalGuideTabsState = {
  tabs: [{ id: 'home', label: 'Accueil', closable: false }],
  activeTabId: 'home',
};

// Map pour stocker les icônes des onglets ouverts (runtime only)
const tabIconsMap = new Map<string, LucideIcon>();
tabIconsMap.set('home', Home);

const InternalGuideTabsContext = createContext<InternalGuideTabsContextValue | null>(null);

export function InternalGuideTabsProvider({ children }: { children: React.ReactNode }) {
  // Charger l'état depuis sessionStorage
  const [state, setState] = useState<InternalGuideTabsState>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as InternalGuideTabsState;
        // S'assurer que l'onglet Accueil est toujours présent
        if (!parsed.tabs.find(t => t.id === 'home')) {
          parsed.tabs.unshift({ id: 'home', label: 'Accueil', closable: false });
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading tabs state:', e);
    }
    return DEFAULT_STATE;
  });

  // Synchroniser avec sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeTabId = state.activeTabId || 'home';

  // Résoudre les onglets avec leurs icônes
  const resolvedTabs: InternalGuideTab[] = useMemo(() => 
    state.tabs.map(tab => ({
      ...tab,
      icon: tabIconsMap.get(tab.id) || Home,
    })),
    [state.tabs]
  );

  const openTab = useCallback((id: string, label: string, icon?: LucideIcon) => {
    // Stocker l'icône dans le map runtime
    if (icon) {
      tabIconsMap.set(id, icon);
    }

    setState(prev => {
      const existingTab = prev.tabs.find(t => t.id === id);
      if (existingTab) {
        // Onglet déjà ouvert, juste l'activer
        return { ...prev, activeTabId: id };
      }

      const newTab: StoredGuideTab = {
        id,
        label,
        closable: id !== 'home',
      };

      return {
        tabs: [...prev.tabs, newTab],
        activeTabId: id,
      };
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    if (tabId === 'home') return; // Ne jamais fermer Accueil

    setState(prev => {
      const tabIndex = prev.tabs.findIndex(t => t.id === tabId);
      const tab = prev.tabs[tabIndex];
      
      if (!tab?.closable) return prev;

      const newTabs = prev.tabs.filter(t => t.id !== tabId);
      
      // Si on ferme l'onglet actif, activer le précédent ou le premier
      let newActiveId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
        if (tabIndex > 0) {
          newActiveId = newTabs[tabIndex - 1]?.id || newTabs[0]?.id || 'home';
        } else {
          newActiveId = newTabs[0]?.id || 'home';
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });

    // Nettoyer l'icône du map
    tabIconsMap.delete(tabId);
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      activeTabId: tabId,
    }));
  }, []);

  const reorderTabs = useCallback((newOrder: string[]) => {
    setState(prev => {
      const reorderedTabs = newOrder
        .map(id => prev.tabs.find(t => t.id === id))
        .filter((t): t is StoredGuideTab => t !== undefined);
      
      return {
        ...prev,
        tabs: reorderedTabs,
      };
    });
  }, []);

  const isTabOpen = useCallback((id: string) => {
    return state.tabs.some(t => t.id === id);
  }, [state.tabs]);

  const value = useMemo(() => ({
    tabs: resolvedTabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab,
    reorderTabs,
    isTabOpen,
  }), [resolvedTabs, activeTabId, openTab, closeTab, setActiveTab, reorderTabs, isTabOpen]);

  return (
    <InternalGuideTabsContext.Provider value={value}>
      {children}
    </InternalGuideTabsContext.Provider>
  );
}

export function useInternalGuideTabs() {
  const context = useContext(InternalGuideTabsContext);
  if (!context) {
    throw new Error('useInternalGuideTabs must be used within a InternalGuideTabsProvider');
  }
  return context;
}
