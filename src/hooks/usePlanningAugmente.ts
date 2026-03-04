/**
 * Hooks React Query pour le module Planification Augmentée
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// SUGGEST PLANNING
// ============================================================================

interface SuggestPlanningInput {
  agency_id: string;
  dossier_id: number;
}

interface Suggestion {
  rank: number;
  date: string;
  hour: string;
  tech_id: number;
  tech_name: string;
  duration: number;
  buffer: number;
  score: number;
  reasons: string[];
}

interface SuggestPlanningResponse {
  success: boolean;
  suggestions: Suggestion[];
  meta: {
    engine_version: string;
    weights: Record<string, number>;
    skills_loaded: number;
    calibrations_loaded: number;
  };
}

export function useSuggestPlanning() {
  return useMutation({
    mutationFn: async (input: SuggestPlanningInput): Promise<SuggestPlanningResponse> => {
      const { data, error } = await supabase.functions.invoke('suggest-planning', {
        body: input,
      });
      if (error) throw error;
      return data as SuggestPlanningResponse;
    },
    onError: (err) => {
      toast.error('Erreur suggestion planning', { description: String(err) });
    },
  });
}

// ============================================================================
// OPTIMIZE WEEK
// ============================================================================

interface OptimizeWeekInput {
  agency_id: string;
  week_start: string; // ISO date
}

interface Move {
  type: 'swap' | 'move' | 'reassign';
  description: string;
  from: string;
  to: string;
  gain_minutes: number;
  gain_ca: number;
  risk: 'low' | 'medium' | 'high';
  explanation: string;
}

interface OptimizeWeekResponse {
  success: boolean;
  moves: Move[];
  summary: {
    total_gain_minutes: number;
    total_gain_ca: number;
    moves_count: number;
    low_risk_count: number;
  };
  meta: {
    engine_version: string;
    weights: Record<string, number> | null;
  };
}

export function useOptimizeWeek() {
  return useMutation({
    mutationFn: async (input: OptimizeWeekInput): Promise<OptimizeWeekResponse> => {
      const { data, error } = await supabase.functions.invoke('optimize-week', {
        body: input,
      });
      if (error) throw error;
      return data as OptimizeWeekResponse;
    },
    onError: (err) => {
      toast.error('Erreur optimisation semaine', { description: String(err) });
    },
  });
}

// ============================================================================
// APPLY ACTION
// ============================================================================

interface ApplyActionInput {
  type: 'suggestion' | 'move';
  id: string;
  action: 'apply' | 'dismiss';
}

export function useApplyPlanningAction() {
  return useMutation({
    mutationFn: async (input: ApplyActionInput) => {
      const { data, error } = await supabase.functions.invoke('apply-planning-action', {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === 'apply' ? 'Action appliquée' : 'Action ignorée'
      );
    },
    onError: (err) => {
      toast.error('Erreur', { description: String(err) });
    },
  });
}

// ============================================================================
// QUERY: Recent suggestions
// ============================================================================

export function useRecentSuggestions(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['planning-suggestions', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('planning_suggestions' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agencyId,
  });
}

// ============================================================================
// QUERY: Recent moves
// ============================================================================

export function useRecentMoves(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['planning-moves', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('planning_moves' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agencyId,
  });
}

// ============================================================================
// QUERY: Optimizer config
// ============================================================================

export function useOptimizerConfig(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['planning-optimizer-config', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from('planning_optimizer_config' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
  });
}
