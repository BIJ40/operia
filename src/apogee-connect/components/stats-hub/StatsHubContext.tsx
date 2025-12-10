import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TabId, StatItem, STATS_INDEX, getNextStat, getPrevStat, getGlobalStatIndex } from './types';

interface StatsHubContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedStat: StatItem | null;
  openStat: (statId: string) => void;
  closeStat: () => void;
  nextStat: () => void;
  prevStat: () => void;
  currentIndex: number;
  totalStats: number;
}

const StatsHubContext = createContext<StatsHubContextValue | null>(null);

export function StatsHubProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [selectedStat, setSelectedStat] = useState<StatItem | null>(null);

  const openStat = useCallback((statId: string) => {
    const stat = STATS_INDEX.find(s => s.id === statId);
    if (stat) {
      setSelectedStat(stat);
      setActiveTab(stat.tab);
    }
  }, []);

  const closeStat = useCallback(() => {
    setSelectedStat(null);
  }, []);

  const nextStat = useCallback(() => {
    if (!selectedStat) return;
    const next = getNextStat(selectedStat.id);
    if (next) {
      setSelectedStat(next);
      setActiveTab(next.tab);
    }
  }, [selectedStat]);

  const prevStat = useCallback(() => {
    if (!selectedStat) return;
    const prev = getPrevStat(selectedStat.id);
    if (prev) {
      setSelectedStat(prev);
      setActiveTab(prev.tab);
    }
  }, [selectedStat]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (selectedStat) {
        // Modal is open
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextStat();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevStat();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeStat();
        }
      } else {
        // Tab shortcuts (1-5)
        const tabs: TabId[] = ['general', 'apporteurs', 'techniciens', 'univers', 'sav'];
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5) {
          setActiveTab(tabs[num - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStat, nextStat, prevStat, closeStat]);

  const currentIndex = selectedStat ? getGlobalStatIndex(selectedStat.id) + 1 : 0;
  const totalStats = STATS_INDEX.length;

  return (
    <StatsHubContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedStat,
        openStat,
        closeStat,
        nextStat,
        prevStat,
        currentIndex,
        totalStats,
      }}
    >
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
