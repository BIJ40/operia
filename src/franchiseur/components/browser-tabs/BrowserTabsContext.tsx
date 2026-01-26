import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useSearchParams } from 'react-router-dom';
import { StoredTabData, BrowserTabData, BrowserTabsState, ModuleDefinition } from './types';
import { 
  Network, PieChart, GitCompare, BarChart3, AreaChart, 
  Building2, UserCog, Coins, Users, Bell 
} from 'lucide-react';
import { FranchiseurProvider } from '@/franchiseur/contexts/FranchiseurContext';
import { NetworkFiltersProvider } from '@/franchiseur/contexts/NetworkFiltersContext';

// Définition de tous les modules disponibles
export const AVAILABLE_MODULES: ModuleDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Network, closable: false },
  { id: 'stats', label: 'Statistiques', icon: PieChart, closable: true },
  { id: 'periodes', label: 'Périodes', icon: GitCompare, closable: true },
  { id: 'comparatif', label: 'Comparatif', icon: BarChart3, closable: true },
  { id: 'graphiques', label: 'Graphiques', icon: AreaChart, closable: true },
  { id: 'agences', label: 'Agences', icon: Building2, closable: true },
  { id: 'animateurs', label: 'Animateurs', icon: UserCog, closable: true, minRole: 'franchisor_admin' },
  { id: 'redevances', label: 'Redevances', icon: Coins, closable: true, minRole: 'franchisor_admin' },
  { id: 'users', label: 'Utilisateurs', icon: Users, closable: true },
  { id: 'annonces', label: 'Annonces', icon: Bell, closable: true },
];

// Helper to get module definition by ID
function getModuleById(id: string): ModuleDefinition | undefined {
  return AVAILABLE_MODULES.find(m => m.id === id);
}

// Resolve stored tabs to runtime tabs with icons
function resolveTabsWithIcons(storedTabs: StoredTabData[]): BrowserTabData[] {
  return storedTabs
    .map(tab => {
      const module = getModuleById(tab.id);
      if (!module) return null;
      return {
        id: tab.id,
        label: tab.label,
        icon: module.icon,
        closable: tab.closable,
      };
    })
    .filter((tab): tab is BrowserTabData => tab !== null);
}

const DEFAULT_STATE: BrowserTabsState = {
  tabs: [{ id: 'dashboard', label: 'Dashboard', closable: false }],
  activeTabId: 'dashboard',
};

interface BrowserTabsContextValue {
  tabs: BrowserTabData[];
  activeTabId: string | null;
  openTab: (moduleId: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (newOrder: string[]) => void;
  getAvailableModules: () => ModuleDefinition[];
  isTabOpen: (moduleId: string) => boolean;
}

const BrowserTabsContext = createContext<BrowserTabsContextValue | null>(null);

export function BrowserTabsProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useSessionState<BrowserTabsState>('reseau_browser_tabs', DEFAULT_STATE);

  // Resolve stored tabs to runtime tabs with icons
  const resolvedTabs = useMemo(() => resolveTabsWithIcons(state.tabs), [state.tabs]);

  // Sync active tab with URL
  const activeTabId = searchParams.get('tab') || state.activeTabId || 'dashboard';

  const openTab = useCallback((moduleId: string) => {
    const module = getModuleById(moduleId);
    if (!module) return;

    setState(prev => {
      const existingTab = prev.tabs.find(t => t.id === moduleId);
      if (existingTab) {
        // Tab already open, just activate it
        return prev;
      }

      const newTab: StoredTabData = {
        id: module.id,
        label: module.label,
        closable: module.closable,
      };

      return {
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTabId: moduleId,
      };
    });

    // Update URL
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', moduleId);
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
      
      // If closing active tab, activate the previous one or first one
      let newActiveId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
        if (tabIndex > 0) {
          newActiveId = newTabs[tabIndex - 1]?.id || newTabs[0]?.id || null;
        } else {
          newActiveId = newTabs[0]?.id || null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });
  }, [setState]);

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

  const reorderTabs = useCallback((newOrder: string[]) => {
    setState(prev => {
      const reorderedTabs = newOrder
        .map(id => prev.tabs.find(t => t.id === id))
        .filter((t): t is StoredTabData => t !== undefined);
      
      return {
        ...prev,
        tabs: reorderedTabs,
      };
    });
  }, [setState]);

  const getAvailableModules = useCallback(() => {
    return AVAILABLE_MODULES;
  }, []);

  const isTabOpen = useCallback((moduleId: string) => {
    return state.tabs.some(t => t.id === moduleId);
  }, [state.tabs]);

  const value = useMemo(() => ({
    tabs: resolvedTabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab,
    reorderTabs,
    getAvailableModules,
    isTabOpen,
  }), [resolvedTabs, activeTabId, openTab, closeTab, setActiveTab, reorderTabs, getAvailableModules, isTabOpen]);

  return (
    <FranchiseurProvider>
      <NetworkFiltersProvider>
        <BrowserTabsContext.Provider value={value}>
          {children}
        </BrowserTabsContext.Provider>
      </NetworkFiltersProvider>
    </FranchiseurProvider>
  );
}

export function useBrowserTabs() {
  const context = useContext(BrowserTabsContext);
  if (!context) {
    throw new Error('useBrowserTabs must be used within a BrowserTabsProvider');
  }
  return context;
}
