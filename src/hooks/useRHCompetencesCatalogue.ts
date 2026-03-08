/**
 * Hook pour gérer le catalogue des compétences techniques
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export interface CompetenceCatalogue {
  id: string;
  agency_id: string | null;
  label: string;
  is_default: boolean;
  created_at: string;
}

export function useCompetencesCatalogue() {
  const { agencyId } = useProfile();
  
  return useQuery({
    queryKey: ['rh-competences-catalogue', agencyId],
    queryFn: async (): Promise<CompetenceCatalogue[]> => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('rh_competences_catalogue')
        .select('*')
        .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
        .order('is_default', { ascending: false })
        .order('label', { ascending: true });
      
      if (error) throw error;
      return data as CompetenceCatalogue[];
    },
    enabled: !!agencyId,
  });
}

export function useAddCompetenceCatalogue() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();
  
  return useMutation({
    mutationFn: async (label: string) => {
      if (!agencyId) throw new Error('No agency');
      
      const { error } = await supabase
        .from('rh_competences_catalogue')
        .insert({
          agency_id: agencyId,
          label: label.trim(),
          is_default: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-competences-catalogue', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['rh-competences-catalogue'] });
      toast.success('Métier ajouté au catalogue');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout');
    },
  });
}

export function useDeleteCompetenceCatalogue() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rh_competences_catalogue')
        .delete()
        .eq('id', id)
        .eq('is_default', false); // Sécurité: ne jamais supprimer les defaults
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-competences-catalogue', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['rh-competences-catalogue'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}
