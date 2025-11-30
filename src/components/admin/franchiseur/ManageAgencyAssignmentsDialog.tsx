import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logError } from "@/lib/logger";

interface ManageAgencyAssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function ManageAgencyAssignmentsDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: ManageAgencyAssignmentsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);

  // Fetch all active agencies
  const { data: agencies } = useQuery({
    queryKey: ['all-agencies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('apogee_agencies')
        .select('*')
        .eq('is_active', true)
        .order('label');
      return data || [];
    },
    enabled: open,
  });

  // Fetch current assignments
  const { data: currentAssignments } = useQuery({
    queryKey: ['agency-assignments', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchiseur_agency_assignments')
        .select('agency_id')
        .eq('user_id', userId);
      return data?.map(a => a.agency_id) || [];
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

  useEffect(() => {
    if (currentAssignments) {
      setSelectedAgencies(currentAssignments);
    }
  }, [currentAssignments]);

  // Update assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async (agencyIds: string[]) => {
      // Delete existing assignments
      await supabase
        .from('franchiseur_agency_assignments')
        .delete()
        .eq('user_id', userId);

      // Insert new assignments
      if (agencyIds.length > 0) {
        const { error } = await supabase
          .from('franchiseur_agency_assignments')
          .insert(agencyIds.map(agencyId => ({ user_id: userId, agency_id: agencyId })));
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Assignations mises à jour",
        description: "Les agences ont été assignées avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['franchiseur-users'] });
      queryClient.invalidateQueries({ queryKey: ['agency-assignments', userId] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les assignations",
        variant: "destructive",
      });
      logError('FRANCHISEUR_ASSIGNMENTS', 'Erreur mise à jour assignations', { error });
    },
  });

  const handleToggleAgency = (agencyId: string) => {
    setSelectedAgencies(prev =>
      prev.includes(agencyId)
        ? prev.filter(id => id !== agencyId)
        : [...prev, agencyId]
    );
  };

  const handleSelectAll = () => {
    if (agencies) {
      setSelectedAgencies(agencies.map(a => a.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedAgencies([]);
  };

  const handleSave = () => {
    updateAssignmentsMutation.mutate(selectedAgencies);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gérer les agences assignées</DialogTitle>
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="rounded-xl"
            >
              Tout sélectionner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="rounded-xl"
            >
              Tout désélectionner
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {agencies?.map((agency) => (
                <div
                  key={agency.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={agency.id}
                    checked={selectedAgencies.includes(agency.id)}
                    onCheckedChange={() => handleToggleAgency(agency.id)}
                  />
                  <Label
                    htmlFor={agency.id}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {agency.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            {selectedAgencies.length} agence(s) sélectionnée(s)
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
            disabled={updateAssignmentsMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-primary to-helpconfort-blue-dark"
          >
            {updateAssignmentsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
