/**
 * Hook pour gérer les overrides SAV (confirmation/infirmation et coût manuel)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

export interface SavOverride {
  id: string;
  project_id: number;
  agency_id: string;
  is_confirmed_sav: boolean | null;
  cout_sav_manuel: number | null;
  techniciens_override: number[] | null;
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
  techniciens_override?: number[] | null;
  notes?: string | null;
}

export function useSavOverrides() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const agencySlug = currentAgency?.slug;
  
  // Récupérer l'UUID de l'agence depuis apogee_agencies
  const { data: agencyData } = useQuery({
    queryKey: ["agency-uuid", agencySlug],
    queryFn: async () => {
      if (!agencySlug) return null;
      const { data, error } = await supabase
        .from("apogee_agencies")
        .select("id")
        .eq("slug", agencySlug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!agencySlug,
  });
  
  const agencyId = agencyData?.id;

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

      // Récupérer l'enregistrement existant pour préserver les valeurs non modifiées
      const existingOverride = overridesMap.get(params.project_id);
      
      const upsertData = {
        project_id: params.project_id,
        agency_id: agencyId,
        confirmed_by: user.user.id,
        confirmed_at: new Date().toISOString(),
        is_confirmed_sav: params.is_confirmed_sav !== undefined 
          ? params.is_confirmed_sav 
          : existingOverride?.is_confirmed_sav ?? null,
        cout_sav_manuel: params.cout_sav_manuel !== undefined 
          ? params.cout_sav_manuel 
          : existingOverride?.cout_sav_manuel ?? null,
        techniciens_override: params.techniciens_override !== undefined
          ? params.techniciens_override
          : existingOverride?.techniciens_override ?? null,
        notes: params.notes !== undefined 
          ? params.notes 
          : existingOverride?.notes ?? null,
      };

      const { data, error } = await supabase
        .from("sav_dossier_overrides")
        .upsert(upsertData, {
          onConflict: "project_id,agency_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (params: UpsertSavOverrideParams) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["sav-overrides", agencyId] });
      
      // Snapshot the previous value
      const previousOverrides = queryClient.getQueryData<SavOverride[]>(["sav-overrides", agencyId]);
      
      // Optimistically update
      if (previousOverrides) {
        const existingIdx = previousOverrides.findIndex(o => o.project_id === params.project_id);
        const existingOverride = existingIdx >= 0 ? previousOverrides[existingIdx] : null;
        
        const newOverride: SavOverride = {
          id: existingOverride?.id || crypto.randomUUID(),
          project_id: params.project_id,
          agency_id: agencyId!,
          is_confirmed_sav: params.is_confirmed_sav !== undefined ? params.is_confirmed_sav : existingOverride?.is_confirmed_sav ?? null,
          cout_sav_manuel: params.cout_sav_manuel !== undefined ? params.cout_sav_manuel : existingOverride?.cout_sav_manuel ?? null,
          techniciens_override: params.techniciens_override !== undefined ? params.techniciens_override : existingOverride?.techniciens_override ?? null,
          confirmed_by: existingOverride?.confirmed_by ?? null,
          confirmed_at: new Date().toISOString(),
          notes: params.notes !== undefined ? params.notes : existingOverride?.notes ?? null,
          created_at: existingOverride?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        const updatedOverrides = existingIdx >= 0
          ? [...previousOverrides.slice(0, existingIdx), newOverride, ...previousOverrides.slice(existingIdx + 1)]
          : [...previousOverrides, newOverride];
        
        queryClient.setQueryData(["sav-overrides", agencyId], updatedOverrides);
      }
      
      return { previousOverrides };
    },
    onSuccess: () => {
      toast.success("Modification SAV enregistrée");
    },
    onError: (error, _params, context) => {
      // Rollback on error
      if (context?.previousOverrides) {
        queryClient.setQueryData(["sav-overrides", agencyId], context.previousOverrides);
      }
      logError("[useSavOverrides] Erreur upsert:", error);
      toast.error("Erreur lors de l'enregistrement");
    },
    onSettled: () => {
      // Refetch to sync with server but data is already shown
      queryClient.invalidateQueries({ queryKey: ["sav-overrides", agencyId] });
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
      return projectId;
    },
    onMutate: async (projectId: number) => {
      await queryClient.cancelQueries({ queryKey: ["sav-overrides", agencyId] });
      
      const previousOverrides = queryClient.getQueryData<SavOverride[]>(["sav-overrides", agencyId]);
      
      if (previousOverrides) {
        queryClient.setQueryData(
          ["sav-overrides", agencyId],
          previousOverrides.filter(o => o.project_id !== projectId)
        );
      }
      
      return { previousOverrides };
    },
    onSuccess: () => {
      toast.success("Override SAV supprimé");
    },
    onError: (error, _projectId, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(["sav-overrides", agencyId], context.previousOverrides);
      }
      logError("[useSavOverrides] Erreur suppression:", error);
      toast.error("Erreur lors de la suppression");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sav-overrides", agencyId] });
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
