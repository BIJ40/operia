/**
 * Hook pour la gestion des collaborateurs (Module RH & Maintenance)
 * RGPD: Les données sensibles sont stockées séparément dans collaborator_sensitive_data
 * 
 * MIGRATED: Uses collaboratorRepository for data access
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { Collaborator, CollaboratorFormData } from '@/types/collaborator';
import { toast } from 'sonner';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { saveSensitiveData } from './useSensitiveData';
import {
  listCollaborators as repoListCollaborators,
  getCollaboratorById,
} from '@/repositories/collaboratorRepository';

export function useCollaborators(agencyId?: string) {
  const { agencyId: userAgencyId } = useEffectiveAuth();
  const canManageCollaborators = useHasMinLevel(2);
  const effectiveAgencyId = agencyId || userAgencyId;
  const queryClient = useQueryClient();

  const { data: collaborators = [], isLoading, error } = useQuery({
    queryKey: ['collaborators', effectiveAgencyId],
    queryFn: async () => {
      if (!effectiveAgencyId) return [];
      return repoListCollaborators(effectiveAgencyId) as Promise<Collaborator[]>;
    },
    enabled: !!effectiveAgencyId,
  });

  // Create collaborator
  const createMutation = useMutation({
    mutationFn: async (formData: CollaboratorFormData) => {
      if (!effectiveAgencyId) throw new Error('Agency ID required');

      // Anti-doublon : vérifier si un collaborateur avec le même nom existe déjà
      if (formData.first_name && formData.last_name) {
        const { data: existing } = await supabase
          .from('collaborators')
          .select('id, first_name, last_name, user_id')
          .eq('agency_id', effectiveAgencyId)
          .ilike('first_name', formData.first_name.trim())
          .ilike('last_name', formData.last_name.trim())
          .limit(1);

        if (existing && existing.length > 0) {
          throw new Error(
            `Un collaborateur "${formData.first_name} ${formData.last_name}" existe déjà dans cette agence. ` +
            (existing[0].user_id 
              ? 'Il est déjà lié à un compte utilisateur.'
              : 'Vous pouvez le retrouver dans la liste des salariés.')
          );
        }
      }

      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          agency_id: effectiveAgencyId,
          user_id: null,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          type: formData.type,
          role: formData.role,
          notes: formData.notes || null,
          hiring_date: formData.hiring_date || null,
          leaving_date: formData.leaving_date || null,
          street: formData.street || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          birth_place: formData.birth_place || null,
          apogee_user_id: formData.apogee_user_id || null,
          is_registered_user: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        await saveSensitiveData(data.id, {
          birth_date: formData.birth_date,
          social_security_number: formData.social_security_number,
          emergency_contact: formData.emergency_contact,
          emergency_phone: formData.emergency_phone,
        });
      }

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
      const { birth_date, social_security_number, emergency_contact, emergency_phone, competences, ...safeData } = data;

      const updatePayload = {
        ...safeData,
        apogee_user_id: 'apogee_user_id' in data 
          ? (data.apogee_user_id ?? null) 
          : undefined,
        updated_at: new Date().toISOString(),
      };
      
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
          delete updatePayload[key as keyof typeof updatePayload];
        }
      });

      const { data: result, error } = await supabase
        .from('collaborators')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (birth_date !== undefined || social_security_number !== undefined || 
          emergency_contact !== undefined || emergency_phone !== undefined) {
        await saveSensitiveData(id, {
          birth_date,
          social_security_number,
          emergency_contact,
          emergency_phone,
        });
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', effectiveAgencyId] });
      queryClient.invalidateQueries({ queryKey: ['collaborator', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sensitive-data', variables.id] });
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
        .from('collaborators')
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
    canManage: canManageCollaborators,
  };
}

// Hook for single collaborator
export function useCollaborator(id: string | undefined) {
  return useQuery({
    queryKey: ['collaborator', id],
    queryFn: async () => {
      if (!id) return null;
      return getCollaboratorById(id) as Promise<Collaborator | null>;
    },
    enabled: !!id,
  });
}
