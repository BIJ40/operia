/**
 * Hook pour la gestion des collaborateurs (Module RH & Maintenance)
 * RGPD: Les données sensibles sont stockées séparément dans collaborator_sensitive_data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { Collaborator, CollaboratorFormData } from '@/types/collaborator';
import { toast } from 'sonner';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { saveSensitiveData } from './useSensitiveData';

export function useCollaborators(agencyId?: string) {
  const { agencyId: userAgencyId } = useEffectiveAuth();
  const canManageCollaborators = useHasMinLevel(2); // N2+ (Dirigeant)
  const effectiveAgencyId = agencyId || userAgencyId;
  const queryClient = useQueryClient();

  // Fetch collaborators for agency
  const { data: collaborators = [], isLoading, error } = useQuery({
    queryKey: ['collaborators', effectiveAgencyId],
    queryFn: async () => {
      if (!effectiveAgencyId) return [];

      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('agency_id', effectiveAgencyId)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as Collaborator[];
    },
    enabled: !!effectiveAgencyId,
  });

  // Create collaborator - Simple fiche RH sans compte utilisateur
  const createMutation = useMutation({
    mutationFn: async (formData: CollaboratorFormData) => {
      if (!effectiveAgencyId) throw new Error('Agency ID required');

      // Créer le collaborateur (fiche RH uniquement, pas de compte système)
      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          agency_id: effectiveAgencyId,
          user_id: null, // Pas de lien avec un compte utilisateur
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
          is_registered_user: false, // Pas un utilisateur du système
        })
        .select()
        .single();

      if (error) throw error;

      // Sauvegarder les données sensibles séparément (RGPD)
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

  // Update collaborator - données sensibles mises à jour séparément
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CollaboratorFormData> }) => {
      // Extraire les données sensibles et les champs non-DB (competences stocké dans rh_competencies)
      const { birth_date, social_security_number, emergency_contact, emergency_phone, competences, ...safeData } = data;

      // Update collaborateur (sans données sensibles)
      // Forcer null si apogee_user_id est undefined (pour pouvoir "désélectionner")
      const updatePayload = {
        ...safeData,
        apogee_user_id: 'apogee_user_id' in data 
          ? (data.apogee_user_id ?? null) 
          : undefined,
        updated_at: new Date().toISOString(),
      };
      
      // Supprimer les champs undefined pour éviter de les envoyer
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

      // Mettre à jour les données sensibles si fournies
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
    // Permissions
    canManage: canManageCollaborators,
  };
}

// Hook for single collaborator
export function useCollaborator(id: string | undefined) {
  return useQuery({
    queryKey: ['collaborator', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Collaborator;
    },
    enabled: !!id,
  });
}
