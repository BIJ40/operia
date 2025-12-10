import React, { createContext, useContext, useState, useEffect } from 'react';
import { TabId } from './types';

interface StatsHubContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

const StatsHubContext = createContext<StatsHubContextValue | null>(null);

export function StatsHubProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // Keyboard shortcuts for tabs (1-5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const tabs: TabId[] = ['general', 'apporteurs', 'techniciens', 'univers', 'sav'];
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        setActiveTab(tabs[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
