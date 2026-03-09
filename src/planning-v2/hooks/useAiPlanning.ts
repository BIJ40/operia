/**
 * Planning V2 — Hook wrapper IA
 * Connecte les edge functions suggest-planning / optimize-week au contexte V2
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuthCore } from "@/contexts/AuthCoreContext";
import { toast } from "sonner";
import type {
  Suggestion,
  SuggestPlanningResponse,
  OptimizeWeekResponse,
  Move,
} from "@/hooks/usePlanningAugmente";

// ─── Scoring weights type ───────────────────────────────────────────────────
export interface ScoringWeights {
  coherence: number;
  equity: number;
  continuity: number;
  route: number;
  gap: number;
  proximity: number;
}

export interface HardConstraints {
  min_skill_level: number;
  buffer_minutes: number;
  max_daily_charge: number;
}

export interface OptimizerConfig {
  id: string;
  agency_id: string;
  weights: ScoringWeights | null;
  hard_constraints: HardConstraints | null;
  updated_at: string | null;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  coherence: 25,
  equity: 15,
  continuity: 15,
  route: 20,
  gap: 15,
  proximity: 10,
};

export const DEFAULT_HARD_CONSTRAINTS: HardConstraints = {
  min_skill_level: 2,
  buffer_minutes: 15,
  max_daily_charge: 85,
};

// ─── Hook principal ─────────────────────────────────────────────────────────
export function useAiPlanning() {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  const queryClient = useQueryClient();

  // --- Suggest planning for a dossier ---
  const suggestMutation = useMutation({
    mutationFn: async (dossierId: number): Promise<SuggestPlanningResponse> => {
      if (!agencyId) throw new Error("Agence non définie");
      const { data, error } = await supabase.functions.invoke("suggest-planning", {
        body: { agency_id: agencyId, dossier_id: dossierId },
      });
      if (error) throw error;
      if (data && !data.success && data.error) throw new Error(data.error);
      return data as SuggestPlanningResponse;
    },
    onError: (err) => {
      toast.error("Erreur suggestion IA", { description: String(err) });
    },
  });

  // --- Optimize week ---
  const optimizeMutation = useMutation({
    mutationFn: async (selectedDate: Date): Promise<OptimizeWeekResponse> => {
      if (!agencyId) throw new Error("Agence non définie");
      const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const { data, error } = await supabase.functions.invoke("optimize-week", {
        body: { agency_id: agencyId, week_start: weekStart },
      });
      if (error) throw error;
      if (data && !data.success && data.error) throw new Error(data.error);
      return data as OptimizeWeekResponse;
    },
    onError: (err) => {
      toast.error("Erreur optimisation", { description: String(err) });
    },
  });

  // --- Apply action ---
  const applyMutation = useMutation({
    mutationFn: async (input: { type: "suggestion" | "move"; id: string; action: "apply" | "dismiss" }) => {
      const { data, error } = await supabase.functions.invoke("apply-planning-action", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === "apply" ? "Action appliquée avec succès" : "Action ignorée");
    },
    onError: (err) => {
      toast.error("Erreur", { description: String(err) });
    },
  });

  // --- Config (weights + hard constraints) ---
  const configQuery = useQuery({
    queryKey: ["planning-optimizer-config", agencyId],
    queryFn: async (): Promise<OptimizerConfig | null> => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from("planning_optimizer_config" as any)
        .select("*")
        .eq("agency_id", agencyId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OptimizerConfig | null;
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });

  const saveConfig = useCallback(
    async (weights: ScoringWeights, hardConstraints: HardConstraints) => {
      if (!agencyId) return;
      const { error } = await supabase
        .from("planning_optimizer_config" as any)
        .upsert(
          {
            agency_id: agencyId,
            weights,
            hard_constraints: hardConstraints,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "agency_id" }
        );
      if (error) {
        toast.error("Erreur sauvegarde config", { description: error.message });
        return;
      }
      toast.success("Configuration IA sauvegardée");
      queryClient.invalidateQueries({ queryKey: ["planning-optimizer-config", agencyId] });
    },
    [agencyId, queryClient]
  );

  return {
    // Suggest
    suggest: suggestMutation.mutateAsync,
    isSuggesting: suggestMutation.isPending,
    suggestions: suggestMutation.data,
    resetSuggestions: suggestMutation.reset,

    // Optimize
    optimize: optimizeMutation.mutateAsync,
    isOptimizing: optimizeMutation.isPending,
    optimizeResult: optimizeMutation.data,
    resetOptimize: optimizeMutation.reset,

    // Apply
    applyAction: applyMutation.mutateAsync,
    isApplying: applyMutation.isPending,

    // Config
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    saveConfig,

    agencyId,
  };
}
