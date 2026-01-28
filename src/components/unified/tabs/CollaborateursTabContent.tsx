/**
 * CollaborateursTabContent - Contenu de l'onglet "Mes collaborateurs"
 * Reprend le contenu de RHSuiviContent
 */

import { RHSuiviContent } from '@/components/rh/RHSuiviContent';

export default function CollaborateursTabContent() {
  return (
    <div className="py-3 px-2 sm:px-4">
      <RHSuiviContent />
    </div>
  );
}
