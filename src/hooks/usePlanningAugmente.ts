/**
 * Hooks React Query pour le module Planification Augmentée v2
 * Consomme les edge functions suggest-planning et optimize-week
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface Suggestion {
  rank: number;
  date: string;
  hour: string;
  tech_id: number;
  tech_name: string;
  duration: number;
  buffer: number;
  score: number;
  score_breakdown: Record<string, number>;
  reasons: string[];
}

export interface HardBlock {
  techId?: number;
  techName: string;
  reason: string;
}

export interface SuggestPlanningResponse {
  success: boolean;
  suggestions: Suggestion[];
  alternatives: Suggestion[];
  blockers: HardBlock[];
  meta: {
    engine_version: string;
    weights?: Record<string, number>;
    techs_total: number;
    techs_with_skills?: number;
    techs_qualified?: number;
    dossier_found?: boolean;
    dossier_universes: string[];
    estimated_duration: number;
    candidates_evaluated: number;
    hard_blocked?: number;
    planning_mode?: string;
    is_first_rdv?: boolean;
    dossier_age_days?: number;
    message?: string;
  };
}

export interface Move {
  type: 'swap' | 'move' | 'reassign';
  description: string;
  from: string;
  to: string;
  gain_minutes: number;
  gain_ca: number;
  risk: 'low' | 'medium' | 'high';
  explanation: string;
  why?: string[];
}

export interface OptimizeWeekResponse {
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
    technicians_count: number;
    range: string;
    working_days: number;
    tech_days_analyzed: number;
  };
}

// ============================================================================
// SUGGEST PLANNING
// ============================================================================

interface SuggestPlanningInput {
  agency_id: string;
  dossier_id: number;
  options?: { min_skill_level?: number; prefer_initiator?: boolean };
}

export function useSuggestPlanning() {
  return useMutation({
    mutationFn: async (input: SuggestPlanningInput): Promise<SuggestPlanningResponse> => {
      const { data, error } = await supabase.functions.invoke('suggest-planning', { body: input });
      if (error) throw error;
      if (data && !data.success && data.error) throw new Error(data.error);
      return data as SuggestPlanningResponse;
    },
    onError: (err) => {
      toast.error('Erreur suggestion planning', { description: String(err) });
    },
  });
}

// ============================================================================
// OPTIMIZE WEEK (2 semaines)
// ============================================================================

interface OptimizeWeekInput {
  agency_id: string;
  week_start: string;
}

export function useOptimizeWeek() {
  return useMutation({
    mutationFn: async (input: OptimizeWeekInput): Promise<OptimizeWeekResponse> => {
      const { data, error } = await supabase.functions.invoke('optimize-week', { body: input });
      if (error) throw error;
      if (data && !data.success && data.error) throw new Error(data.error);
      return data as OptimizeWeekResponse;
    },
    onError: (err) => {
      toast.error('Erreur optimisation', { description: String(err) });
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
      const { data, error } = await supabase.functions.invoke('apply-planning-action', { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'apply' ? 'Action appliquée' : 'Action ignorée');
    },
    onError: (err) => {
      toast.error('Erreur', { description: String(err) });
    },
  });
}

// ============================================================================
// QUERIES
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

// ============================================================================
// TECHNICIAN SKILLS (new structured model)
// ============================================================================

export interface TechSkill {
  id: string;
  collaborator_id: string;
  univers_code: string;
  level: number;
  is_primary: boolean;
  notes: string | null;
}

export function useTechnicianSkills(collaboratorId: string | undefined) {
  return useQuery({
    queryKey: ['technician-skills', collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      const { data, error } = await supabase
        .from('technician_skills' as any)
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .order('univers_code');
      if (error) throw error;
      return (data || []) as unknown as TechSkill[];
    },
    enabled: !!collaboratorId,
  });
}

export function useUpsertTechSkill() {
  return useMutation({
    mutationFn: async (skill: { collaborator_id: string; univers_code: string; level: number; is_primary: boolean; notes?: string }) => {
      const { data, error } = await supabase
        .from('technician_skills' as any)
        .upsert(skill, { onConflict: 'collaborator_id,univers_code' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Compétence mise à jour'),
    onError: (err) => toast.error('Erreur', { description: String(err) }),
  });
}

export function useDeleteTechSkill() {
  return useMutation({
    mutationFn: async ({ collaboratorId, universCode }: { collaboratorId: string; universCode: string }) => {
      const { error } = await supabase
        .from('technician_skills' as any)
        .delete()
        .eq('collaborator_id', collaboratorId)
        .eq('univers_code', universCode);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Compétence supprimée'),
  });
}

// ============================================================================
// UNIVERS CATALOG
// ============================================================================

export interface UniversCatalogItem {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export function useUniversCatalog() {
  return useQuery({
    queryKey: ['univers-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('univers_catalog' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as UniversCatalogItem[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// TECHNICIAN PROFILE (amplitude, jours, base)
// ============================================================================

export interface TechnicianProfileData {
  collaborator_id: string;
  home_base_label: string;
  home_lat: number | null;
  home_lng: number | null;
  work_days: Record<string, boolean>;
  day_start: string;
  day_end: string;
  lunch_start: string;
  lunch_end: string;
  max_drive_minutes_per_day: number;
}

export function useTechnicianProfile(collaboratorId: string | undefined) {
  return useQuery({
    queryKey: ['technician-profile', collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return null;
      const { data, error } = await supabase
        .from('technician_profile' as any)
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TechnicianProfileData | null;
    },
    enabled: !!collaboratorId,
  });
}

export function useUpsertTechProfile() {
  return useMutation({
    mutationFn: async (profile: Partial<TechnicianProfileData> & { collaborator_id: string }) => {
      const { data, error } = await supabase
        .from('technician_profile' as any)
        .upsert(profile, { onConflict: 'collaborator_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Profil technicien mis à jour'),
    onError: (err) => toast.error('Erreur', { description: String(err) }),
  });
}
