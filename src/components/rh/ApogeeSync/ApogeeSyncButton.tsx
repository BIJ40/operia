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
        variant="ghost"
        size="sm"
        onClick={handleOpenDialog}
        disabled={loading || !agencySlug}
        className="text-muted-foreground hover:text-foreground relative"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {totalChanges > 0 && !loading && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
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
