/**
 * Types pour le système d'onglets Véhicules
 */

import type { LucideIcon } from 'lucide-react';

// Données stockées en sessionStorage (sans icônes, sérialisables)
export interface VehicleStoredTabData {
  id: string;           // 'overview' | vehicleId (UUID)
  label: string;        // 'Vue d'ensemble' | 'AB-123-CD'
  closable: boolean;
}

// Données runtime avec icône résolue
export interface VehicleTabData extends VehicleStoredTabData {
  type: 'overview' | 'vehicle';
  vehicleId?: string;
  icon: LucideIcon;
}

// État complet des onglets
export interface VehicleTabsState {
  tabs: VehicleStoredTabData[];
  activeTabId: string;
}
