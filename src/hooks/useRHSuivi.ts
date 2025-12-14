/**
 * Hook principal pour le module Suivi RH
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  RHCollaborator, 
  RHEpiProfile, 
  RHCompetencies, 
  RHAssets, 
  RHItAccess,
  RHTablePrefs 
} from '@/types/rh-suivi';

// ============================================================================
// Collaborators List
// ============================================================================

export function useRHCollaborators() {
  const { agencyId } = useAuth();
  
  return useQuery({
    queryKey: ['rh-collaborators', agencyId],
    queryFn: async (): Promise<RHCollaborator[]> => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          *,
          rh_epi_profiles(*),
          rh_competencies(*),
          rh_assets(*),
          rh_it_access(*)
        `)
        .eq('agency_id', agencyId)
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(c => ({
        ...c,
        epi_profile: c.rh_epi_profiles?.[0] || null,
        competencies: c.rh_competencies?.[0] || null,
        assets: c.rh_assets?.[0] || null,
        it_access: c.rh_it_access?.[0] || null,
      })) as RHCollaborator[];
    },
    enabled: !!agencyId,
  });
}

// ============================================================================
// Single Collaborator
// ============================================================================

export function useRHCollaborator(collaboratorId: string | undefined) {
  return useQuery({
    queryKey: ['rh-collaborator', collaboratorId],
    queryFn: async (): Promise<RHCollaborator | null> => {
      if (!collaboratorId) return null;
      
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          *,
          rh_epi_profiles(*),
          rh_competencies(*),
          rh_assets(*),
          rh_it_access(*)
        `)
        .eq('id', collaboratorId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        epi_profile: data.rh_epi_profiles?.[0] || null,
        competencies: data.rh_competencies?.[0] || null,
        assets: data.rh_assets?.[0] || null,
        it_access: data.rh_it_access?.[0] || null,
      } as RHCollaborator;
    },
    enabled: !!collaboratorId,
  });
}

// ============================================================================
// EPI Profile Mutations
// ============================================================================

export function useUpdateEpiProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ collaboratorId, data }: { collaboratorId: string; data: Partial<RHEpiProfile> }) => {
      // Upsert: create if not exists, update if exists
      const { error } = await supabase
        .from('rh_epi_profiles')
        .upsert({ 
          collaborator_id: collaboratorId,
          ...data 
        }, { 
          onConflict: 'collaborator_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      toast.success('Profil EPI mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ============================================================================
// Competencies Mutations
// ============================================================================

export function useUpdateCompetencies() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ collaboratorId, data }: { collaboratorId: string; data: Partial<RHCompetencies> }) => {
      const { caces, autres_habilitations, ...rest } = data;
      const { error } = await supabase
        .from('rh_competencies')
        .upsert({ 
          collaborator_id: collaboratorId,
          derniere_maj: new Date().toISOString(),
          caces: caces ? JSON.stringify(caces) : undefined,
          autres_habilitations: autres_habilitations ? JSON.stringify(autres_habilitations) : undefined,
          ...rest 
        } as any, { 
          onConflict: 'collaborator_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      toast.success('Compétences mises à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ============================================================================
// Assets Mutations
// ============================================================================

export function useUpdateAssets() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ collaboratorId, data }: { collaboratorId: string; data: Partial<RHAssets> }) => {
      const { autres_equipements, ...rest } = data;
      const { error } = await supabase
        .from('rh_assets')
        .upsert({ 
          collaborator_id: collaboratorId,
          autres_equipements: autres_equipements ? JSON.stringify(autres_equipements) : undefined,
          ...rest 
        } as any, { 
          onConflict: 'collaborator_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      toast.success('Matériel mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ============================================================================
// IT Access Mutations
// ============================================================================

export function useUpdateItAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ collaboratorId, data }: { collaboratorId: string; data: Partial<RHItAccess> }) => {
      const { error } = await supabase
        .from('rh_it_access')
        .upsert({ 
          collaborator_id: collaboratorId,
          ...data 
        }, { 
          onConflict: 'collaborator_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      toast.success('Accès IT mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ============================================================================
// Table Preferences
// ============================================================================

export function useRHTablePrefs() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['rh-table-prefs', user?.id],
    queryFn: async (): Promise<RHTablePrefs | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('rh_table_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as RHTablePrefs | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateRHTablePrefs() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { hidden_columns?: string[]; column_order?: string[] }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('rh_table_prefs')
        .upsert({ 
          user_id: user.id,
          ...data 
        }, { 
          onConflict: 'user_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-table-prefs'] });
    },
  });
}
