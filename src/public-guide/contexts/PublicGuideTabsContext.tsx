/**
 * PublicGuideTabsContext - Gestion des onglets navigateur pour le Guide Apogée public
 * Permet d'ouvrir plusieurs catégories en onglets côte à côte
 */

import React, { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LucideIcon, Home } from 'lucide-react';

// Type stocké en sessionStorage (sans icône)
export interface StoredGuideTab {
  id: string;
  label: string;
  closable: boolean;
}

// Type runtime avec icône résolue
export interface PublicGuideTab {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
}

interface PublicGuideTabsState {
  tabs: StoredGuideTab[];
  activeTabId: string;
}

interface PublicGuideTabsContextValue {
  tabs: PublicGuideTab[];
  activeTabId: string;
  openTab: (id: string, label: string, icon?: LucideIcon) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (newOrder: string[]) => void;
  isTabOpen: (id: string) => boolean;
}

const STORAGE_KEY = 'public_guide_tabs';

const DEFAULT_STATE: PublicGuideTabsState = {
  tabs: [{ id: 'home', label: 'Accueil', closable: false }],
  activeTabId: 'home',
};

// Map pour stocker les icônes des onglets ouverts (runtime only)
const tabIconsMap = new Map<string, LucideIcon>();
tabIconsMap.set('home', Home);

const PublicGuideTabsContext = createContext<PublicGuideTabsContextValue | null>(null);

export function PublicGuideTabsProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Charger l'état depuis sessionStorage
  const [state, setState] = useState<PublicGuideTabsState>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PublicGuideTabsState;
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

  // Synchroniser l'onglet actif avec l'URL
  const activeTabId = searchParams.get('tab') || state.activeTabId || 'home';

  // Résoudre les onglets avec leurs icônes
  const resolvedTabs: PublicGuideTab[] = useMemo(() => 
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

    // Mettre à jour l'URL
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', id);
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

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

    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tabId);
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

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
    <PublicGuideTabsContext.Provider value={value}>
      {children}
    </PublicGuideTabsContext.Provider>
  );
}

export function usePublicGuideTabs() {
  const context = useContext(PublicGuideTabsContext);
  if (!context) {
    throw new Error('usePublicGuideTabs must be used within a PublicGuideTabsProvider');
  }
  return context;
}
