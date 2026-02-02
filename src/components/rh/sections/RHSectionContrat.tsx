/**
 * Section Contrat & Salaire pour le panneau RH
 * Wrapper autour de ContractSalaryTab pour intégration dans la nouvelle interface
 */

import { ContractSalaryTab } from '@/components/collaborators/ContractSalaryTab';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import type { RHCollaborator } from '@/types/rh-suivi';

interface RHSectionContratProps {
  collaborator: RHCollaborator;
}

export function RHSectionContrat({ collaborator }: RHSectionContratProps) {
  const canManage = useHasMinLevel(2);
  
  return (
    <div className="-m-4">
      <ContractSalaryTab 
        collaboratorId={collaborator.id}
        canManage={canManage}
      />
    </div>
  );
}
