/**
 * Dialogue de confirmation de synchronisation Apogée
 * Affiche un aperçu des modifications à appliquer avec possibilité de sélection
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, RefreshCw, UserX, Loader2, Link } from 'lucide-react';
import type { SyncAction } from '@/hooks/useApogeeSync';
import { cn } from '@/lib/utils';

interface ApogeeSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: SyncAction[];
  onConfirm: (selectedActions: SyncAction[]) => void;
  isSyncing: boolean;
}

export function ApogeeSyncDialog({
  open,
  onOpenChange,
  actions,
  onConfirm,
  isSyncing,
}: ApogeeSyncDialogProps) {
  // Set de IDs sélectionnés (tous sélectionnés par défaut)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Réinitialiser la sélection quand les actions changent
  useEffect(() => {
    setSelectedIds(new Set(actions.map(a => a.apogeeUser.id)));
  }, [actions]);
  
  const createActions = actions.filter(a => a.type === 'create');
  const updateActions = actions.filter(a => a.type === 'update');
  const departedActions = actions.filter(a => a.type === 'mark_departed');
  const linkActions = actions.filter(a => a.type === 'link');
  
  const selectedActions = useMemo(() => 
    actions.filter(a => selectedIds.has(a.apogeeUser.id)),
    [actions, selectedIds]
  );
  
  const toggleAction = (apogeeUserId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(apogeeUserId)) {
        next.delete(apogeeUserId);
      } else {
        next.add(apogeeUserId);
      }
      return next;
    });
  };
  
  const toggleAll = (actionList: SyncAction[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      actionList.forEach(a => {
        if (checked) {
          next.add(a.apogeeUser.id);
        } else {
          next.delete(a.apogeeUser.id);
        }
      });
      return next;
    });
  };
  
  const handleConfirm = () => {
    onConfirm(selectedActions);
  };
  
  const isAllSelected = (actionList: SyncAction[]) => 
    actionList.every(a => selectedIds.has(a.apogeeUser.id));
  
  const isSomeSelected = (actionList: SyncAction[]) => 
    actionList.some(a => selectedIds.has(a.apogeeUser.id)) && !isAllSelected(actionList);
  
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
                    <Checkbox
                      checked={isAllSelected(createActions)}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement).dataset.indeterminate = String(isSomeSelected(createActions));
                      }}
                      onCheckedChange={(checked) => toggleAll(createActions, checked as boolean)}
                    />
                    <UserPlus className="h-4 w-4" />
                    <span>À créer ({createActions.filter(a => selectedIds.has(a.apogeeUser.id)).length}/{createActions.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {createActions.map((action) => (
                      <div
                        key={action.apogeeUser.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md transition-colors",
                          selectedIds.has(action.apogeeUser.id)
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-muted/30 opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(action.apogeeUser.id)}
                          onCheckedChange={() => toggleAction(action.apogeeUser.id)}
                        />
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
                    <Checkbox
                      checked={isAllSelected(updateActions)}
                      onCheckedChange={(checked) => toggleAll(updateActions, checked as boolean)}
                    />
                    <RefreshCw className="h-4 w-4" />
                    <span>À mettre à jour ({updateActions.filter(a => selectedIds.has(a.apogeeUser.id)).length}/{updateActions.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {updateActions.map((action) => (
                      <div
                        key={action.apogeeUser.id}
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          selectedIds.has(action.apogeeUser.id)
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedIds.has(action.apogeeUser.id)}
                            onCheckedChange={() => toggleAction(action.apogeeUser.id)}
                          />
                          <p className="font-medium">
                            {action.existingCollaborator?.first_name} {action.existingCollaborator?.last_name}
                          </p>
                        </div>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-0.5 pl-6">
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
                    <Checkbox
                      checked={isAllSelected(departedActions)}
                      onCheckedChange={(checked) => toggleAll(departedActions, checked as boolean)}
                    />
                    <UserX className="h-4 w-4" />
                    <span>À marquer comme partis ({departedActions.filter(a => selectedIds.has(a.apogeeUser.id)).length}/{departedActions.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {departedActions.map((action) => (
                      <div
                        key={action.apogeeUser.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md transition-colors",
                          selectedIds.has(action.apogeeUser.id)
                            ? "bg-orange-50 dark:bg-orange-900/20"
                            : "bg-muted/30 opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(action.apogeeUser.id)}
                          onCheckedChange={() => toggleAction(action.apogeeUser.id)}
                        />
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
            <Button onClick={handleConfirm} disabled={isSyncing || selectedActions.length === 0}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Appliquer ({selectedActions.length} sélectionné{selectedActions.length > 1 ? 's' : ''})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
