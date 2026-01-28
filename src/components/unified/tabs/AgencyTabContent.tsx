/**
 * AgencyTabContent - Contenu de l'onglet "Mon agence"
 * Affiche les infos agence + actions à mener
 */

import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';

export default function AgencyTabContent() {
  return (
    <div className="container mx-auto py-4 px-4 space-y-4">
      <AgencyInfoCompact />
      <ActionsAMenerTab />
    </div>
  );
}
