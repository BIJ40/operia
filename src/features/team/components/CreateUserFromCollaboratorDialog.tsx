/**
 * Dialog pour créer un utilisateur à partir d'un collaborateur
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgencyCollaborator, COLLABORATOR_ROLE_LABELS } from "../types";
import { GlobalRole, GLOBAL_ROLE_LABELS, getAssignableRoles } from "@/types/globalRoles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMarkCollaboratorAsRegistered } from "../hooks";
import { useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/logger";

interface CreateUserFromCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: AgencyCollaborator | null;
  agencyLabel?: string;
  onSuccess?: () => void;
}

export function CreateUserFromCollaboratorDialog({
  open,
  onOpenChange,
  collaborator,
  agencyLabel,
  onSuccess,
}: CreateUserFromCollaboratorDialogProps) {
  const { globalRole } = useAuth();
  const queryClient = useQueryClient();
  const markAsRegistered = useMarkCollaboratorAsRegistered(collaborator?.agency_id || "");
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<GlobalRole>("franchisee_user");
  const [email, setEmail] = useState("");

  // Reset email when dialog opens with new collaborator
  useState(() => {
    if (collaborator?.email) {
      setEmail(collaborator.email);
    }
  });

  // Rôles assignables par l'utilisateur courant
  const assignableRoles = getAssignableRoles(globalRole);
  // Filtrer pour ne montrer que N1-N2 pour les créations depuis collaborateurs
  const availableRoles = assignableRoles.filter(
    (r) => r === "franchisee_user" || r === "franchisee_admin"
  );

  // Email final (du formulaire ou du collaborateur)
  const finalEmail = email || collaborator?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborator || !finalEmail) return;

    setIsLoading(true);
    try {
      // Appeler l'edge function create-user
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: finalEmail,
          first_name: collaborator.first_name,
          last_name: collaborator.last_name,
          global_role: selectedRole,
          agency_id: collaborator.agency_id,
          role_agence: COLLABORATOR_ROLE_LABELS[collaborator.role],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Marquer le collaborateur comme inscrit
      if (data?.user?.id) {
        await markAsRegistered.mutateAsync({
          collaboratorId: collaborator.id,
          userId: data.user.id,
        });
      }

      toast.success(`Compte créé pour ${collaborator.first_name} ${collaborator.last_name}`);
      queryClient.invalidateQueries({ queryKey: ["agency-users"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      logError("TEAM", "Erreur création utilisateur depuis collaborateur", { error });
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setIsLoading(false);
    }
  };

  if (!collaborator) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un compte utilisateur</DialogTitle>
          <DialogDescription>
            Un compte sera créé pour ce collaborateur avec un mot de passe temporaire.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={collaborator.first_name} disabled />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={collaborator.last_name} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input 
              id="email"
              type="email"
              value={email || collaborator.email || ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              required
            />
          </div>

          {agencyLabel && (
            <div className="space-y-2">
              <Label>Agence</Label>
              <Input value={agencyLabel} disabled />
            </div>
          )}

          <div className="space-y-2">
            <Label>Poste actuel</Label>
            <Input value={COLLABORATOR_ROLE_LABELS[collaborator.role]} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="global_role">Rôle global *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as GlobalRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {GLOBAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !finalEmail}>
              {isLoading ? "Création..." : "Créer le compte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
