/**
 * Hook pour gérer les overrides SAV (confirmation/infirmation et coût manuel)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { toast } from "sonner";

export interface SavOverride {
  id: string;
  project_id: number;
  agency_id: string;
  is_confirmed_sav: boolean | null;
  cout_sav_manuel: number | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertSavOverrideParams {
  project_id: number;
  is_confirmed_sav?: boolean | null;
  cout_sav_manuel?: number | null;
  notes?: string | null;
}

export function useSavOverrides() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;

  const { data: overrides = [], isLoading, error } = useQuery({
    queryKey: ["sav-overrides", agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from("sav_dossier_overrides")
        .select("*")
        .eq("agency_id", agencyId);
      
      if (error) throw error;
      return data as SavOverride[];
    },
    enabled: !!agencyId,
  });

  // Créer une map pour accès rapide par project_id
  const overridesMap = new Map<number, SavOverride>();
  overrides.forEach(o => overridesMap.set(o.project_id, o));

  const upsertMutation = useMutation({
    mutationFn: async (params: UpsertSavOverrideParams) => {
      if (!agencyId) throw new Error("Agency ID required");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("sav_dossier_overrides")
        .upsert({
          project_id: params.project_id,
          agency_id: agencyId,
          is_confirmed_sav: params.is_confirmed_sav,
          cout_sav_manuel: params.cout_sav_manuel,
          notes: params.notes,
          confirmed_by: user.user.id,
          confirmed_at: new Date().toISOString(),
        }, {
          onConflict: "project_id,agency_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sav-overrides", agencyId] });
      toast.success("Modification SAV enregistrée");
    },
    onError: (error) => {
      console.error("Erreur upsert SAV:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      if (!agencyId) throw new Error("Agency ID required");

      const { error } = await supabase
        .from("sav_dossier_overrides")
        .delete()
        .eq("project_id", projectId)
        .eq("agency_id", agencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sav-overrides", agencyId] });
      toast.success("Override SAV supprimé");
    },
    onError: (error) => {
      console.error("Erreur suppression SAV:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  return {
    overrides,
    overridesMap,
    isLoading,
    error,
    upsertOverride: upsertMutation.mutate,
    deleteOverride: deleteMutation.mutate,
    isUpdating: upsertMutation.isPending || deleteMutation.isPending,
  };
}
