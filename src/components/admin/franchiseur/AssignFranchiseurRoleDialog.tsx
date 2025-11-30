import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface AssignFranchiseurRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function AssignFranchiseurRoleDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: AssignFranchiseurRoleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<'animateur' | 'directeur' | 'dg'>('animateur');

  // Fetch current role
  const { data: currentRole } = useQuery({
    queryKey: ['franchiseur-role', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', userId)
        .maybeSingle();
      return data?.franchiseur_role || 'animateur';
    },
    enabled: open,
  });

  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: open,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (role: 'animateur' | 'directeur' | 'dg') => {
      // Check if role exists
      const { data: existing } = await supabase
        .from('franchiseur_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('franchiseur_roles')
          .update({ franchiseur_role: role })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('franchiseur_roles')
          .insert({ user_id: userId, franchiseur_role: role });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle franchiseur a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
      queryClient.invalidateQueries({ queryKey: ['franchiseur-role', userId] });
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
          {userInfo && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">
                {userInfo.first_name} {userInfo.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{userInfo.email}</p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Rôle Franchiseur</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as any)}
              defaultValue={currentRole}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="animateur" id="animateur" />
                <Label htmlFor="animateur" className="cursor-pointer flex-1">
                  <div>
                    <p className="font-medium">Animateur réseau</p>
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
                    <p className="font-medium">Directeur réseau</p>
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
                    <p className="font-medium">Directeur Général (DG)</p>
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
