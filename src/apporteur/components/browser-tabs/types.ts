/**
 * Types pour le système d'onglets Apporteur
 */

import type { LucideIcon } from 'lucide-react';

// Données stockées en sessionStorage (sérialisables, sans icônes)
export interface ApporteurStoredTabData {
  id: string;
  label: string;
  closable: boolean;
}

// Données runtime avec icône résolue
export interface ApporteurTabData extends ApporteurStoredTabData {
  icon: LucideIcon;
}

// État complet des onglets
export interface ApporteurTabsState {
  tabs: ApporteurStoredTabData[];
  activeTabId: string;
}

// Définition d'un module/onglet disponible
export interface ApporteurModuleDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  closable: boolean;
}
