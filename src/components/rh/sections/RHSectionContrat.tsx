/**
 * Section Contrat & Salaire simplifiée pour le panneau RH
 * - Heures hebdo éditables directement
 * - Lien vers document contrat (médiathèque)
 * - Historique salaire avec taux horaire + graphique évolution
 */

import { RHContractSalarySimple } from './RHContractSalarySimple';
import type { RHCollaborator } from '@/types/rh-suivi';

interface RHSectionContratProps {
  collaborator: RHCollaborator;
}

export function RHSectionContrat({ collaborator }: RHSectionContratProps) {
  return <RHContractSalarySimple collaborator={collaborator} />;
}
