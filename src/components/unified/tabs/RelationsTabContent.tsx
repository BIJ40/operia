/**
 * RelationsTabContent - Contenu de l'onglet "Relations"
 * Gestion des apporteurs et échanges
 */

import { MesApporteursTab } from '@/components/pilotage/MesApporteursTab';

export default function RelationsTabContent() {
  return (
    <div className="py-3 px-2 sm:px-4">
      <MesApporteursTab />
    </div>
  );
}
