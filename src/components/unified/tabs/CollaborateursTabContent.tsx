/**
 * CollaborateursTabContent - Contenu de l'onglet "Mes collaborateurs"
 * Reprend le contenu de RHSuiviContent
 * MfaGuard ajouté car contient des données sensibles (SSN, ICE)
 * Wrapped in React.memo to prevent re-renders on tab switches
 */

import { memo } from 'react';
import { RHSuiviContent } from '@/components/rh/RHSuiviContent';
import { MfaGuard } from '@/components/auth/MfaGuard';

export default memo(function CollaborateursTabContent() {
  return (
    <div className="py-3 px-2 sm:px-4">
      <MfaGuard>
        <RHSuiviContent />
      </MfaGuard>
    </div>
  );
});
