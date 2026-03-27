/**
 * Bouton de synchronisation Apogée avec badge de notifications
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    executeSync,
    isSyncing,
    refetch,
  } = useApogeeSync({ agencySlug, collaborators });
  
  const handleOpenDialog = async () => {
    // Forcer un refresh des données avant d'ouvrir le dialogue
    if (refetch) {
      await refetch();
    }
    setDialogOpen(true);
  };
  
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
        onClick={handleOpenDialog}
        disabled={loading || !agencySlug}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Importer depuis Apogée
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
