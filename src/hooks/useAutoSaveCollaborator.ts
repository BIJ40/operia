/**
 * Hook d'auto-save pour les données collaborateur
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAutoSaveCollaborator(collaboratorId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('collaborators')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', collaboratorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', collaboratorId] });
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const saveField = useCallback(async (field: string, value: unknown) => {
    await mutation.mutateAsync({ [field]: value || null });
  }, [mutation]);

  return { saveField, isSaving: mutation.isPending };
}

export function useAutoSaveEpi(collaboratorId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('rh_epi_profiles')
        .upsert({ 
          collaborator_id: collaboratorId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'collaborator_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', collaboratorId] });
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde EPI');
    },
  });

  const saveField = useCallback(async (field: string, value: unknown) => {
    await mutation.mutateAsync({ [field]: value || null });
  }, [mutation]);

  return { saveField, isSaving: mutation.isPending };
}

export function useAutoSaveCompetencies(collaboratorId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('rh_competencies')
        .upsert({ 
          collaborator_id: collaboratorId,
          derniere_maj: new Date().toISOString(),
          ...updates,
        } as Record<string, unknown>, { 
          onConflict: 'collaborator_id' 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['rh-collaborator', collaboratorId] });
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde des compétences');
    },
  });

  const saveField = useCallback(async (field: string, value: unknown) => {
    await mutation.mutateAsync({ [field]: value });
  }, [mutation]);

  const saveMultiple = useCallback(async (updates: Record<string, unknown>) => {
    await mutation.mutateAsync(updates);
  }, [mutation]);

  return { saveField, saveMultiple, isSaving: mutation.isPending };
}

// Direct update function (for use outside of hooks)
export async function updateCollaboratorField(collaboratorId: string, field: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('collaborators')
    .update({ [field]: value || null, updated_at: new Date().toISOString() })
    .eq('id', collaboratorId);
  
  if (error) {
    toast.error('Erreur lors de la sauvegarde');
    throw error;
  }
  
  toast.success('Enregistré');
}
