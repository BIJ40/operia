/**
 * Liste unifiée des collaborateurs avec indicateur de statut d'accès
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, UserPlus, UserCheck, Mail } from "lucide-react";
import { AgencyCollaborator, COLLABORATOR_ROLE_LABELS } from "../types";

interface UnifiedTeamListProps {
  collaborators: AgencyCollaborator[];
  onEdit?: (collaborator: AgencyCollaborator) => void;
  onDelete?: (collaborator: AgencyCollaborator) => void;
  onCreateUser?: (collaborator: AgencyCollaborator) => void;
  canDelete?: boolean;
  canCreateUser?: boolean;
}

export function UnifiedTeamList({
  collaborators,
  onEdit,
  onDelete,
  onCreateUser,
  canDelete = false,
  canCreateUser = false,
}: UnifiedTeamListProps) {
  const [deleteTarget, setDeleteTarget] = useState<AgencyCollaborator | null>(null);

  const handleConfirmDelete = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
    }
    setDeleteTarget(null);
  };

  if (collaborators.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun collaborateur dans l'équipe. Cliquez sur "Ajouter un collaborateur" pour commencer.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {collaborators.map((collaborator) => (
          <div
            key={collaborator.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={collaborator.is_registered_user ? "bg-green-100 text-green-700" : "bg-muted"}>
                  {collaborator.first_name?.[0]}
                  {collaborator.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {collaborator.first_name} {collaborator.last_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {COLLABORATOR_ROLE_LABELS[collaborator.role]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {collaborator.email ? (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {collaborator.email}
                    </span>
                  ) : (
                    <span className="text-orange-500 italic">Email non renseigné</span>
                  )}
                  {collaborator.phone && (
                    <span>• {collaborator.phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Indicateur de statut */}
              {collaborator.is_registered_user ? (
                <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  Compte actif
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Sans compte
                  </Badge>
                  {/* Bouton créer compte - visible si canCreateUser */}
                  {canCreateUser && onCreateUser && (
                    <Button
                      size="sm"
                      variant={collaborator.email ? "default" : "outline"}
                      onClick={() => {
                        if (collaborator.email) {
                          onCreateUser(collaborator);
                        } else {
                          // Ouvrir l'édition pour ajouter l'email d'abord
                          onEdit?.(collaborator);
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      {collaborator.email ? "Créer un compte" : "Ajouter email"}
                    </Button>
                  )}
                </div>
              )}

              {/* Menu actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(collaborator)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {canCreateUser && !collaborator.is_registered_user && collaborator.email && onCreateUser && (
                    <DropdownMenuItem onClick={() => onCreateUser(collaborator)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Créer un compte
                    </DropdownMenuItem>
                  )}
                  {canDelete && onDelete && !collaborator.is_registered_user && (
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(collaborator)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce collaborateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le collaborateur{" "}
              <strong>
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </strong>{" "}
              sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
