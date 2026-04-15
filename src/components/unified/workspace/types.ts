/**
 * Shared types for the UnifiedWorkspace module
 */

export type UnifiedTab = 
  | 'accueil' 
  | 'pilotage' 
  | 'commercial' 
  | 'organisation' 
  | 'relations'
  | 'documents'
  | 'support' 
  | 'ticketing'
  | 'admin';

export interface TabConfig {
  id: UnifiedTab;
  label: string;
  icon: React.ElementType;
  requiresOption?: { module: string; option?: string };
  altModules?: string[];
}

// Freemium: Organisation, Documents, Ticketing retirés de la navigation
export const DEFAULT_TAB_ORDER: UnifiedTab[] = ['pilotage', 'commercial', 'relations', 'support', 'admin'];
