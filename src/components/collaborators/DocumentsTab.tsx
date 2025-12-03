/**
 * Onglet Documents RH - Wrapper vers HRDocumentManager
 */

import { HRDocumentManager } from './documents';

interface DocumentsTabProps {
  collaboratorId: string;
  canManage: boolean;
}

export function DocumentsTab({ collaboratorId, canManage }: DocumentsTabProps) {
  return (
    <HRDocumentManager 
      collaboratorId={collaboratorId} 
      canManage={canManage} 
    />
  );
}
