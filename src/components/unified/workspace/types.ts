/**
 * Shared types for the UnifiedWorkspace module
 */

export type UnifiedTab = 
  | 'accueil' 
  | 'pilotage' 
  | 'commercial' 
  | 'organisation' 
  | 'documents'
  | 'ticketing' 
  | 'aide'
  | 'admin';

export interface TabConfig {
  id: UnifiedTab;
  label: string;
  icon: React.ElementType;
  requiresOption?: { module: string; option?: string };
  altModules?: string[];
}

export const DEFAULT_TAB_ORDER: UnifiedTab[] = ['pilotage', 'commercial', 'organisation', 'documents', 'ticketing', 'aide', 'admin'];
