/**
 * Types pour le système d'onglets RH
 */

import type { LucideIcon } from 'lucide-react';
import type { CollaboratorType } from '@/types/collaborator';

// Données stockées en sessionStorage (sans icônes, sérialisables)
export interface RHStoredTabData {
  id: string;           // 'overview' | collaboratorId (UUID)
  label: string;        // 'Vue d'ensemble' | 'Jean Dupont'
  closable: boolean;
}

// Données runtime avec icône résolue
export interface RHTabData extends RHStoredTabData {
  type: 'overview' | 'collaborator';
  collaboratorId?: string;
  collaboratorType?: CollaboratorType;
  icon: LucideIcon;
}

// État complet des onglets
export interface RHTabsState {
  tabs: RHStoredTabData[];
  activeTabId: string;
}
