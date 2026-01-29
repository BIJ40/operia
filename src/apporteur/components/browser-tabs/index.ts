/**
 * Exports du système d'onglets Apporteur
 */

export { ApporteurTabsProvider, useApporteurTabs, APPORTEUR_MODULES } from './ApporteurTabsContext';
export { ApporteurTabsBar } from './ApporteurTabsBar';
export { ApporteurTabsContent } from './ApporteurTabsContent';
export type { 
  ApporteurTabData, 
  ApporteurStoredTabData, 
  ApporteurTabsState, 
  ApporteurModuleDefinition 
} from './types';
