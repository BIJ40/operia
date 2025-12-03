/**
 * Hook pour la gestion des collaborateurs (Module RH & Parc)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Collaborator, CollaboratorFormData } from '@/types/collaborator';
import { toast } from 'sonner';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';

export function useCollaborators(agencyId?: string) {
  const { agencyId: userAgencyId } = useAuth();
  const canManageCollaborators = useHasMinLevel(2); // N2+ (Dirigeant)
  const effectiveAgencyId = agencyId || userAgencyId;
  const queryClient = useQueryClient();

  // Fetch collaborators for agency
  const { data: collaborators = [], isLoading, error } = useQuery({
    queryKey: ['collaborators', effectiveAgencyId],
    queryFn: async () => {
      if (!effectiveAgencyId) return [];

      const { data, error } = await supabase
        .from('agency_collaborators')
        .select('*')
        .eq('agency_id', effectiveAgencyId)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as Collaborator[];
    },
    enabled: !!effectiveAgencyId,
  });

  // Create collaborator
  const createMutation = useMutation({
    mutationFn: async (formData: CollaboratorFormData) => {
      if (!effectiveAgencyId) throw new Error('Agency ID required');

      const { data, error } = await supabase
        .from('agency_collaborators')
        .insert({
          agency_id: effectiveAgencyId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          type: formData.type,
          role: formData.role,
          notes: formData.notes || null,
          hiring_date: formData.hiring_date || null,
          leaving_date: formData.leaving_date || null,
          birth_date: formData.birth_date || null,
          address: formData.address || null,
          social_security_number: formData.social_security_number || null,
          emergency_contact: formData.emergency_contact || null,
          emergency_phone: formData.emergency_phone || null,
          apogee_user_id: formData.apogee_user_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', effectiveAgencyId] });
      toast.success('Collaborateur créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update collaborator
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CollaboratorFormData> }) => {
      const { data: result, error } = await supabase
        .from('agency_collaborators')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', effectiveAgencyId] });
      toast.success('Collaborateur mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete collaborator
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agency_collaborators')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', effectiveAgencyId] });
      toast.success('Collaborateur supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Stats helpers
  const activeCollaborators = collaborators.filter(c => !c.leaving_date);
  const byType = collaborators.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    collaborators,
    activeCollaborators,
    byType,
    isLoading,
    error,
    createMutation,
    updateMutation,
    deleteMutation,
    // Permissions
    canManage: canManageCollaborators,
  };
}

// Hook for single collaborator
export function useCollaborator(id: string | undefined) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['collaborator', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('agency_collaborators')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Collaborator;
    },
    enabled: !!id,
  });
}
