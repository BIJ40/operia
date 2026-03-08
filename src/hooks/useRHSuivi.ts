/**
 * Hook principal pour le module Suivi RH
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logError } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
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

export function useRHCollaborators(options?: { includeFormer?: boolean }) {
  const { agencyId } = useEffectiveAuth();
  const includeFormer = options?.includeFormer ?? false;
  
  return useQuery({
    queryKey: ['rh-collaborators', agencyId, { includeFormer }],
    queryFn: async (): Promise<RHCollaborator[]> => {
      if (!agencyId) return [];
      
      let query = supabase
        .from('collaborators')
        .select(`
          *,
          rh_epi_profiles(*),
          rh_competencies(*),
          rh_assets(*),
          rh_it_access(*),
          collaborator_sensitive_data(
            birth_date_encrypted,
            emergency_contact_encrypted,
            emergency_phone_encrypted
          )
        `)
        .eq('agency_id', agencyId);
      
      // Par défaut, exclure les collaborateurs ayant quitté l'agence
      if (!includeFormer) {
        query = query.is('leaving_date', null);
      }
      
      const { data, error } = await query.order('last_name', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(c => ({
        ...c,
        // Relations 1-1 renvoyées comme objets (et non tableaux)
        epi_profile: (c as any).rh_epi_profiles || null,
        competencies: (c as any).rh_competencies || null,
        assets: (c as any).rh_assets || null,
        it_access: (c as any).rh_it_access || null,
        sensitive_data: (c as any).collaborator_sensitive_data || null,
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
          rh_it_access(*),
          collaborator_sensitive_data(
            birth_date_encrypted,
            emergency_contact_encrypted,
            emergency_phone_encrypted
          )
        `)
        .eq('id', collaboratorId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        epi_profile: (data as any).rh_epi_profiles || null,
        competencies: (data as any).rh_competencies || null,
        assets: (data as any).rh_assets || null,
        it_access: (data as any).rh_it_access || null,
        sensitive_data: (data as any).collaborator_sensitive_data || null,
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
      // JSONB fields - do NOT stringify, store native arrays/objects
      const { error } = await supabase
        .from('rh_competencies')
        .upsert({ 
          collaborator_id: collaboratorId,
          derniere_maj: new Date().toISOString(),
          ...data 
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
      // JSONB fields - do NOT stringify, store native arrays/objects
      const { error } = await supabase
        .from('rh_assets')
        .upsert({ 
          collaborator_id: collaboratorId,
          ...data 
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
  const { user } = useAuthCore();
  
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
  const { user } = useAuthCore();
  
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

// ============================================================================
// Delete Collaborator (Hard Delete)
// ============================================================================

export function useDeleteCollaborator() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (collaboratorId: string) => {
      // D'abord supprimer les données liées (cascade devrait gérer ça, mais au cas où)
      await supabase.from('rh_epi_profiles').delete().eq('collaborator_id', collaboratorId);
      await supabase.from('rh_competencies').delete().eq('collaborator_id', collaboratorId);
      await supabase.from('rh_assets').delete().eq('collaborator_id', collaboratorId);
      await supabase.from('rh_it_access').delete().eq('collaborator_id', collaboratorId);
      await supabase.from('collaborator_sensitive_data').delete().eq('collaborator_id', collaboratorId);
      // Note: media_links pour ce collaborateur sont conservés dans la médiathèque
      
      // Supprimer le collaborateur
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);
      
      if (error) throw error;
      return collaboratorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      toast.success('Collaborateur supprimé définitivement');
    },
    onError: (error) => {
      logError('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

// ============================================================================
// Update Collaborator Type (Classification)
// ============================================================================

export function useUpdateCollaboratorType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ collaboratorId, type }: { collaboratorId: string; type: string }) => {
      const { error } = await supabase
        .from('collaborators')
        .update({ type, updated_at: new Date().toISOString() })
        .eq('id', collaboratorId);
      
      if (error) throw error;
      return { collaboratorId, type };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      toast.success('Classification mise à jour');
    },
    onError: (error) => {
      logError('Update type error:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}
