/**
 * CollaborateursTabContent - Contenu de l'onglet "Mes collaborateurs"
 * Reprend le contenu de RHSuiviContent
 */

import { RHSuiviContent } from '@/components/rh/RHSuiviContent';

export default function CollaborateursTabContent() {
  return (
    <div className="container mx-auto py-4 px-4">
      <RHSuiviContent />
    </div>
  );
}
