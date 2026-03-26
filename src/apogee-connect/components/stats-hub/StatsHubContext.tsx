import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TabId } from './types';

const STORAGE_KEY = 'stats-hub-active-tab';
const VALID_TABS: TabId[] = ['general', 'apporteurs', 'techniciens', 'univers', 'sav', 'previsionnel', 'financier', 'tresorerie'];

function getStoredTab(): TabId {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && VALID_TABS.includes(stored as TabId)) {
      return stored as TabId;
    }
  } catch {
    // sessionStorage might not be available
  }
  return 'general';
}

interface StatsHubContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

const StatsHubContext = createContext<StatsHubContextValue | null>(null);

export function StatsHubProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState<TabId>(getStoredTab);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem(STORAGE_KEY, tab);
    } catch {
      // Ignore storage errors
    }
  }, []);


  return (
    <StatsHubContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </StatsHubContext.Provider>
  );
}

export function useStatsHub() {
  const ctx = useContext(StatsHubContext);
  if (!ctx) {
    throw new Error('useStatsHub must be used within StatsHubProvider');
  }
  return ctx;
}
