/**
 * Types pour le système d'onglets Apporteurs (browser-tabs)
 */

import type { LucideIcon } from 'lucide-react';

// Données stockées en sessionStorage (sérialisables)
export interface ApporteurStoredTabData {
  id: string;           // 'overview' | apporteurId
  label: string;        // 'Recherche' | 'Nom Apporteur'
  closable: boolean;
}

// Données runtime avec icône résolue
export interface ApporteurTabData extends ApporteurStoredTabData {
  type: 'overview' | 'apporteur';
  apporteurId?: string;
  icon: LucideIcon;
}

// État complet des onglets
export interface ApporteurTabsState {
  tabs: ApporteurStoredTabData[];
  activeTabId: string;
}
