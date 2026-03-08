/**
 * Shared types for the UnifiedWorkspace module
 */

export type UnifiedTab = 
  | 'accueil' 
  | 'stats' 
  | 'salaries' 
  | 'outils' 
  | 'documents'
  | 'guides'
  | 'ticketing' 
  | 'aide'
  | 'admin'
  | 'test';

export interface TabConfig {
  id: UnifiedTab;
  label: string;
  icon: React.ElementType;
  requiresOption?: { module: string; option?: string };
  altModules?: string[];
}

export const DEFAULT_TAB_ORDER: UnifiedTab[] = ['stats', 'salaries', 'outils', 'documents', 'guides', 'ticketing', 'aide', 'admin', 'test'];
