/**
 * Hook pour gérer la session de support en direct active
 * DEPRECATED: Utiliser useLiveSupportContext à la place
 * Ce hook est conservé pour rétrocompatibilité mais délègue au contexte
 */

import { useLiveSupportContext } from '@/contexts/LiveSupportContext';

export function useLiveSupportSession() {
  // Délègue simplement au contexte partagé
  return useLiveSupportContext();
}
