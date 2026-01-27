/**
 * Dialogue de confirmation de synchronisation Apogée
 * Affiche un aperçu des modifications à appliquer
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, RefreshCw, UserX, Loader2 } from 'lucide-react';
import type { SyncAction } from '@/hooks/useApogeeSync';
import { cn } from '@/lib/utils';

interface ApogeeSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: SyncAction[];
  onConfirm: () => void;
  isSyncing: boolean;
}

export function ApogeeSyncDialog({
  open,
  onOpenChange,
  actions,
  onConfirm,
  isSyncing,
}: ApogeeSyncDialogProps) {
  const createActions = actions.filter(a => a.type === 'create');
  const updateActions = actions.filter(a => a.type === 'update');
  const departedActions = actions.filter(a => a.type === 'mark_departed');
  
  const handleConfirm = () => {
    onConfirm();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Synchronisation Apogée</DialogTitle>
          <DialogDescription>
            {actions.length === 0
              ? 'Tous les collaborateurs sont à jour.'
              : `${actions.length} modification(s) détectée(s) entre Apogée et votre base RH.`}
          </DialogDescription>
        </DialogHeader>
        
        {actions.length > 0 && (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-6">
              {/* Nouveaux collaborateurs */}
              {createActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <UserPlus className="h-4 w-4" />
                    <span>À créer ({createActions.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {createActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {action.apogeeUser.firstname} {action.apogeeUser.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {action.apogeeUser.email || 'Pas d\'email'} • {action.apogeeUser.type}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Nouveau
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Mises à jour */}
              {updateActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    <RefreshCw className="h-4 w-4" />
                    <span>À mettre à jour ({updateActions.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {updateActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20"
                      >
                        <p className="font-medium">
                          {action.existingCollaborator?.first_name} {action.existingCollaborator?.last_name}
                        </p>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          {action.changes?.map((change, cIdx) => (
                            <li key={cIdx}>• {change}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Départs */}
              {departedActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                    <UserX className="h-4 w-4" />
                    <span>À marquer comme partis ({departedActions.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {departedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-900/20"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {action.existingCollaborator?.first_name} {action.existingCollaborator?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Désactivé dans Apogée
                          </p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Départ
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            Annuler
          </Button>
          {actions.length > 0 && (
            <Button onClick={handleConfirm} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Appliquer les modifications
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
