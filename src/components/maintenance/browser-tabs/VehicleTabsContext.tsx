/**
 * Context pour la gestion des onglets Véhicules
 * Pattern identique à RHTabsContext
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Car } from 'lucide-react';
import type { VehicleStoredTabData, VehicleTabData, VehicleTabsState } from './types';
import type { FleetVehicle } from '@/types/maintenance';

const DEFAULT_STATE: VehicleTabsState = {
  tabs: [{ id: 'overview', label: 'Vue d\'ensemble', closable: false }],
  activeTabId: 'overview',
};

// Résoudre les onglets stockés vers les onglets runtime avec icônes
function resolveTabsWithIcons(
  storedTabs: VehicleStoredTabData[],
  vehiclesMap: Map<string, FleetVehicle>
): VehicleTabData[] {
  return storedTabs.map(tab => {
    if (tab.id === 'overview') {
      return {
        ...tab,
        type: 'overview' as const,
        icon: LayoutGrid,
      };
    }
    
    // C'est un onglet véhicule
    return {
      ...tab,
      type: 'vehicle' as const,
      vehicleId: tab.id,
      icon: Car,
    };
  });
}

interface VehicleTabsContextValue {
  tabs: VehicleTabData[];
  activeTabId: string | null;
  openVehicle: (vehicle: FleetVehicle) => void;
  openVehicleById: (vehicleId: string, label: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (newOrder: string[]) => void;
  isTabOpen: (vehicleId: string) => boolean;
}

const VehicleTabsContext = createContext<VehicleTabsContextValue | null>(null);

interface VehicleTabsProviderProps {
  children: React.ReactNode;
  vehicles: FleetVehicle[];
}

export function VehicleTabsProvider({ children, vehicles }: VehicleTabsProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useSessionState<VehicleTabsState>('vehicle_tabs', DEFAULT_STATE);
  
  // Créer une map pour lookup rapide
  const vehiclesMap = useMemo(() => {
    const map = new Map<string, FleetVehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);
  
  // Résoudre les onglets avec icônes
  const resolvedTabs = useMemo(
    () => resolveTabsWithIcons(state.tabs, vehiclesMap),
    [state.tabs, vehiclesMap]
  );
  
  // Sync active tab avec URL
  const activeTabId = searchParams.get('tab') || state.activeTabId || 'overview';
  
  const openVehicle = useCallback((vehicle: FleetVehicle) => {
    const tabId = vehicle.id;
    const label = vehicle.registration || vehicle.name;
    
    setState(prev => {
      const existingTab = prev.tabs.find(t => t.id === tabId);
      if (existingTab) {
        // Onglet déjà ouvert, juste l'activer
        return { ...prev, activeTabId: tabId };
      }
      
      const newTab: VehicleStoredTabData = {
        id: tabId,
        label,
        closable: true,
      };
      
      return {
        tabs: [...prev.tabs, newTab],
        activeTabId: tabId,
      };
    });
    
    // Update URL
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tabId);
      return newParams;
    }, { replace: true });
  }, [setState, setSearchParams]);

  const openVehicleById = useCallback((vehicleId: string, label: string) => {
    setState(prev => {
      const existingTab = prev.tabs.find(t => t.id === vehicleId);
      if (existingTab) {
        return { ...prev, activeTabId: vehicleId };
      }
      
      const newTab: VehicleStoredTabData = {
        id: vehicleId,
        label,
        closable: true,
      };
      
      return {
        tabs: [...prev.tabs, newTab],
        activeTabId: vehicleId,
      };
    });
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', vehicleId);
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
        .filter((t): t is VehicleStoredTabData => t !== undefined);
      
      return {
        ...prev,
        tabs: reorderedTabs,
      };
    });
  }, [setState]);
  
  const isTabOpen = useCallback((vehicleId: string) => {
    return state.tabs.some(t => t.id === vehicleId);
  }, [state.tabs]);
  
  const value = useMemo(() => ({
    tabs: resolvedTabs,
    activeTabId,
    openVehicle,
    openVehicleById,
    closeTab,
    setActiveTab,
    reorderTabs,
    isTabOpen,
  }), [resolvedTabs, activeTabId, openVehicle, openVehicleById, closeTab, setActiveTab, reorderTabs, isTabOpen]);
  
  return (
    <VehicleTabsContext.Provider value={value}>
      {children}
    </VehicleTabsContext.Provider>
  );
}

export function useVehicleTabs() {
  const context = useContext(VehicleTabsContext);
  if (!context) {
    throw new Error('useVehicleTabs must be used within a VehicleTabsProvider');
  }
  return context;
}
