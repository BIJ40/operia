/**
 * RoleSimulatorContext - Permet aux admins de simuler différentes vues utilisateur
 * Disponible uniquement pour N5+ (platform_admin, superadmin)
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { GlobalRole } from '@/types/globalRoles';

export type SimulatedView = 
  | 'none'           // Vue normale (admin)
  | 'franchisee'     // Vue Franchisé (N2)
  | 'franchiseur'    // Vue Franchiseur (N3/N4)
  | 'n0_project'     // Vue N0 avec gestion de projet
  | 'n0_simple';     // Vue N0 simple (partenaire)

export interface SimulatedViewConfig {
  id: SimulatedView;
  label: string;
  description: string;
  simulatedRole: GlobalRole;
  simulatedModules?: string[];
}

export const SIMULATED_VIEWS: SimulatedViewConfig[] = [
  {
    id: 'none',
    label: 'Ma vue (Admin)',
    description: 'Vue normale avec tous les accès',
    simulatedRole: 'superadmin',
  },
  {
    id: 'franchisee',
    label: 'Vue Franchisé',
    description: 'Dirigeant agence (N2)',
    simulatedRole: 'franchisee_admin',
  },
  {
    id: 'franchiseur',
    label: 'Vue Franchiseur',
    description: 'Équipe réseau (N3/N4)',
    simulatedRole: 'franchisor_user',
  },
  {
    id: 'n0_project',
    label: 'Vue N0 + Projet',
    description: 'Partenaire avec gestion de projet',
    simulatedRole: 'base_user',
    simulatedModules: ['apogee_tickets'],
  },
  {
    id: 'n0_simple',
    label: 'Vue N0 Simple',
    description: 'Partenaire externe basique',
    simulatedRole: 'base_user',
  },
];

interface RoleSimulatorContextValue {
  /** Vue actuellement simulée */
  simulatedView: SimulatedView;
  /** Configuration de la vue simulée */
  viewConfig: SimulatedViewConfig;
  /** Définir une nouvelle vue simulée */
  setSimulatedView: (view: SimulatedView) => void;
  /** Est-ce qu'on simule une vue ? */
  isSimulating: boolean;
  /** Réinitialiser à la vue normale */
  resetSimulation: () => void;
}

const RoleSimulatorContext = createContext<RoleSimulatorContextValue | null>(null);

const STORAGE_KEY = 'admin_simulated_view';

export function RoleSimulatorProvider({ children }: { children: React.ReactNode }) {
  const [simulatedView, setSimulatedViewState] = useState<SimulatedView>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored && SIMULATED_VIEWS.some(v => v.id === stored)) {
        return stored as SimulatedView;
      }
    } catch {
      // Ignore storage errors
    }
    return 'none';
  });

  const setSimulatedView = useCallback((view: SimulatedView) => {
    setSimulatedViewState(view);
    try {
      sessionStorage.setItem(STORAGE_KEY, view);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulatedView('none');
  }, [setSimulatedView]);

  const viewConfig = useMemo(() => {
    return SIMULATED_VIEWS.find(v => v.id === simulatedView) || SIMULATED_VIEWS[0];
  }, [simulatedView]);

  const isSimulating = simulatedView !== 'none';

  const value = useMemo(() => ({
    simulatedView,
    viewConfig,
    setSimulatedView,
    isSimulating,
    resetSimulation,
  }), [simulatedView, viewConfig, setSimulatedView, isSimulating, resetSimulation]);

  return (
    <RoleSimulatorContext.Provider value={value}>
      {children}
    </RoleSimulatorContext.Provider>
  );
}

export function useRoleSimulator() {
  const context = useContext(RoleSimulatorContext);
  if (!context) {
    throw new Error('useRoleSimulator must be used within RoleSimulatorProvider');
  }
  return context;
}

/**
 * Hook pour obtenir le rôle effectif (réel ou simulé)
 */
export function useEffectiveRole(realRole: GlobalRole | null): GlobalRole | null {
  const context = useContext(RoleSimulatorContext);
  
  // Si pas de contexte ou pas de simulation, retourner le rôle réel
  if (!context || !context.isSimulating) {
    return realRole;
  }
  
  return context.viewConfig.simulatedRole;
}
