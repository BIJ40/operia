import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { GlobalRole, GLOBAL_ROLES } from "@/types/globalRoles";

interface AssignFranchiseurRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

type FranchiseurRoleOption = 'animateur' | 'directeur' | 'dg';

/**
 * Mapping: animateur=N3, directeur=N4, dg=N5
 */
const FRANCHISEUR_TO_GLOBAL: Record<FranchiseurRoleOption, GlobalRole> = {
  animateur: 'franchisor_user',
  directeur: 'franchisor_admin',
  dg: 'platform_admin',
};

/**
 * Dérive le rôle franchiseur depuis global_role
 */
function deriveFromGlobalRole(globalRole: GlobalRole | null): FranchiseurRoleOption {
  if (!globalRole) return 'animateur';
  const level = GLOBAL_ROLES[globalRole] ?? 0;
  if (level >= 5) return 'dg';
  if (level >= 4) return 'directeur';
  return 'animateur';
}

export function AssignFranchiseurRoleDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: AssignFranchiseurRoleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<FranchiseurRoleOption>('animateur');

  // Fetch current global_role
  const { data: profile } = useQuery({
    queryKey: ['user-profile-role', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, global_role')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: open,
  });

  // Set initial selected role from global_role
  useEffect(() => {
    if (profile?.global_role) {
      setSelectedRole(deriveFromGlobalRole(profile.global_role as GlobalRole));
    }
  }, [profile?.global_role]);

  // Update global_role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (role: FranchiseurRoleOption) => {
      const newGlobalRole = FRANCHISEUR_TO_GLOBAL[role];
      
      const { error } = await supabase
        .from('profiles')
        .update({ global_role: newGlobalRole })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle franchiseur a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile-role', userId] });
      queryClient.invalidateQueries({ queryKey: ['animators'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
      logError('FRANCHISEUR', 'Error updating franchiseur role:', error);
    },
  });

  const handleSave = () => {
    updateRoleMutation.mutate(selectedRole);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assigner un rôle franchiseur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {profile && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Rôle Franchiseur</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as FranchiseurRoleOption)}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="animateur" id="animateur" />
                <Label htmlFor="animateur" className="cursor-pointer flex-1">
                  <div>
                    <p className="font-medium">Animateur réseau (N3)</p>
                    <p className="text-sm text-muted-foreground">
                      Accès aux statistiques et navigation entre agences assignées
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="directeur" id="directeur" />
                <Label htmlFor="directeur" className="cursor-pointer flex-1">
                  <div>
                    <p className="font-medium">Directeur réseau (N4)</p>
                    <p className="text-sm text-muted-foreground">
                      Accès complet + gestion des redevances et animateurs
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="dg" id="dg" />
                <Label htmlFor="dg" className="cursor-pointer flex-1">
                  <div>
                    <p className="font-medium">Directeur Général (N5)</p>
                    <p className="text-sm text-muted-foreground">
                      Accès complet à toutes les fonctionnalités
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateRoleMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-primary to-helpconfort-blue-dark"
          >
            {updateRoleMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
