/**
 * Context pour la gestion des onglets Apporteurs
 * Pattern identique à RHTabsContext
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { LayoutGrid, Building2 } from 'lucide-react';
import type { ApporteurStoredTabData, ApporteurTabData, ApporteurTabsState } from './types';

const DEFAULT_STATE: ApporteurTabsState = {
  tabs: [{ id: 'overview', label: 'Liste', closable: false }],
  activeTabId: 'overview',
};

function resolveTabsWithIcons(storedTabs: ApporteurStoredTabData[]): ApporteurTabData[] {
  return storedTabs.map(tab => {
    if (tab.id === 'overview') {
      return { ...tab, type: 'overview' as const, icon: LayoutGrid };
    }
    return { ...tab, type: 'apporteur' as const, apporteurId: tab.id, icon: Building2 };
  });
}

interface ApporteurTabsContextValue {
  tabs: ApporteurTabData[];
  activeTabId: string | null;
  openApporteur: (id: string, name: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (newOrder: string[]) => void;
  isTabOpen: (apporteurId: string) => boolean;
}

const ApporteurTabsContext = createContext<ApporteurTabsContextValue | null>(null);

export function ApporteurTabsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useSessionState<ApporteurTabsState>('prospection_apporteur_tabs', DEFAULT_STATE);

  const resolvedTabs = useMemo(() => resolveTabsWithIcons(state.tabs), [state.tabs]);
  const activeTabId = state.activeTabId || 'overview';

  const openApporteur = useCallback((id: string, name: string) => {
    setState(prev => {
      const existing = prev.tabs.find(t => t.id === id);
      if (existing) return { ...prev, activeTabId: id };
      const newTab: ApporteurStoredTabData = { id, label: name, closable: true };
      return { tabs: [...prev.tabs, newTab], activeTabId: id };
    });
  }, [setState]);

  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const tabIndex = prev.tabs.findIndex(t => t.id === tabId);
      const tab = prev.tabs[tabIndex];
      if (!tab?.closable) return prev;

      const newTabs = prev.tabs.filter(t => t.id !== tabId);
      let newActiveId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
        newActiveId = tabIndex > 0
          ? (newTabs[tabIndex - 1]?.id || 'overview')
          : (newTabs[0]?.id || 'overview');
      }
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  }, [setState]);

  const setActiveTab = useCallback((tabId: string) => {
    setState(prev => ({ ...prev, activeTabId: tabId }));
  }, [setState]);

  const reorderTabs = useCallback((newOrder: string[]) => {
    setState(prev => {
      const reordered = newOrder
        .map(id => prev.tabs.find(t => t.id === id))
        .filter((t): t is ApporteurStoredTabData => t !== undefined);
      return { ...prev, tabs: reordered };
    });
  }, [setState]);

  const isTabOpen = useCallback((apporteurId: string) => {
    return state.tabs.some(t => t.id === apporteurId);
  }, [state.tabs]);

  const value = useMemo(() => ({
    tabs: resolvedTabs, activeTabId, openApporteur, closeTab, setActiveTab, reorderTabs, isTabOpen,
  }), [resolvedTabs, activeTabId, openApporteur, closeTab, setActiveTab, reorderTabs, isTabOpen]);

  return (
    <ApporteurTabsContext.Provider value={value}>
      {children}
    </ApporteurTabsContext.Provider>
  );
}

export function useApporteurTabs() {
  const context = useContext(ApporteurTabsContext);
  if (!context) throw new Error('useApporteurTabs must be used within ApporteurTabsProvider');
  return context;
}
