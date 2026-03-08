/**
 * CollaborateursTabContent - Contenu de l'onglet "Mes collaborateurs"
 * Reprend le contenu de RHSuiviContent
 * Wrapped in React.memo to prevent re-renders on tab switches
 */

import { memo } from 'react';
import { RHSuiviContent } from '@/components/rh/RHSuiviContent';

export default memo(function CollaborateursTabContent() {
  return (
    <div className="py-3 px-2 sm:px-4">
      <RHSuiviContent />
    </div>
  );
});
