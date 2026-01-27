/**
 * Bouton de synchronisation Apogée avec badge de notifications
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useApogeeSync, SyncAction } from '@/hooks/useApogeeSync';
import { ApogeeSyncDialog } from './ApogeeSyncDialog';
import type { RHCollaborator } from '@/types/rh-suivi';

interface ApogeeSyncButtonProps {
  agencySlug?: string;
  collaborators: RHCollaborator[];
}

export function ApogeeSyncButton({ agencySlug, collaborators }: ApogeeSyncButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const {
    syncActions,
    loading,
    totalChanges,
    executeSync,
    isSyncing,
  } = useApogeeSync({ agencySlug, collaborators });
  
  const handleConfirm = (selectedActions: SyncAction[]) => {
    executeSync(selectedActions, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        disabled={loading || !agencySlug}
        className="relative"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Sync Apogée
        {totalChanges > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs"
          >
            {totalChanges}
          </Badge>
        )}
      </Button>
      
      <ApogeeSyncDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        actions={syncActions}
        onConfirm={handleConfirm}
        isSyncing={isSyncing}
      />
    </>
  );
}
