/**
 * Table des collaborateurs
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { AgencyCollaborator, COLLABORATOR_ROLE_LABELS } from "../types";

interface CollaboratorsTableProps {
  collaborators: AgencyCollaborator[];
  showAgency?: boolean;
  agencyLabels?: Record<string, string>;
  onEdit?: (collaborator: AgencyCollaborator) => void;
  onDelete?: (collaborator: AgencyCollaborator) => void;
  onCreateUser?: (collaborator: AgencyCollaborator) => void;
  canDelete?: boolean;
  canCreateUser?: boolean;
}

export function CollaboratorsTable({
  collaborators,
  showAgency = false,
  agencyLabels = {},
  onEdit,
  onDelete,
  onCreateUser,
  canDelete = false,
  canCreateUser = false,
}: CollaboratorsTableProps) {
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
        Aucun collaborateur trouvé
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {showAgency && <TableHead>Agence</TableHead>}
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collaborators.map((collaborator) => (
              <TableRow key={collaborator.id}>
                {showAgency && (
                  <TableCell className="font-medium">
                    {(collaborator as any).agency_label || agencyLabels[collaborator.agency_id] || "-"}
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {collaborator.first_name} {collaborator.last_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {COLLABORATOR_ROLE_LABELS[collaborator.role]}
                  </Badge>
                </TableCell>
                <TableCell>{collaborator.email || "-"}</TableCell>
                <TableCell>{collaborator.phone || "-"}</TableCell>
                <TableCell>
                  {collaborator.is_registered_user ? (
                    <Badge variant="default" className="bg-green-600">
                      Inscrit
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Non inscrit</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
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
                      {canDelete && onDelete && (
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
