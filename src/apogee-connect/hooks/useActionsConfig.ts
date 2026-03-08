import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { ActionsConfig, DEFAULT_CONFIG } from '../types/actions';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export function useActionsConfig() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  // Récupérer la configuration de l'utilisateur
  const { data: config, isLoading } = useQuery({
    queryKey: ['actions-config', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return DEFAULT_CONFIG;

      const { data, error } = await supabase
        .from('user_actions_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logError('ACTIONS_CONFIG', 'Erreur chargement config actions', { error });
        return DEFAULT_CONFIG;
      }

      if (!data) {
        return DEFAULT_CONFIG;
      }

      return {
        delai_devis_a_faire: data.delai_devis_a_faire,
        delai_a_facturer: data.delai_a_facturer,
        delai_relance_technicien: data.delai_relance_technicien,
      } as ActionsConfig;
    },
  });

  // Sauvegarder ou mettre à jour la configuration
  const saveMutation = useMutation({
    mutationFn: async (newConfig: ActionsConfig) => {
      if (!user) throw new Error('Utilisateur non connecté');

      // Vérifier si une config existe déjà
      const { data: existing } = await supabase
        .from('user_actions_config')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Mise à jour
        const { error } = await supabase
          .from('user_actions_config')
          .update({
            delai_devis_a_faire: newConfig.delai_devis_a_faire,
            delai_a_facturer: newConfig.delai_a_facturer,
            delai_relance_technicien: newConfig.delai_relance_technicien,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('user_actions_config')
          .insert({
            user_id: user.id,
            delai_devis_a_faire: newConfig.delai_devis_a_faire,
            delai_a_facturer: newConfig.delai_a_facturer,
            delai_relance_technicien: newConfig.delai_relance_technicien,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions-config'] });
      queryClient.invalidateQueries({ queryKey: ['actions-a-mener'] });
      toast.success('Configuration sauvegardée');
    },
    onError: (error) => {
      logError('ACTIONS_CONFIG', 'Erreur sauvegarde config', { error });
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Réinitialiser aux valeurs par défaut
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase
        .from('user_actions_config')
        .update({
          delai_devis_a_faire: DEFAULT_CONFIG.delai_devis_a_faire,
          delai_a_facturer: DEFAULT_CONFIG.delai_a_facturer,
          delai_relance_technicien: DEFAULT_CONFIG.delai_relance_technicien,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions-config'] });
      queryClient.invalidateQueries({ queryKey: ['actions-a-mener'] });
      toast.success('Configuration réinitialisée');
    },
    onError: (error) => {
      logError('ACTIONS_CONFIG', 'Erreur réinitialisation config', { error });
      toast.error('Erreur lors de la réinitialisation');
    },
  });

  return {
    config: config || DEFAULT_CONFIG,
    isLoading,
    saveConfig: saveMutation.mutate,
    resetConfig: resetMutation.mutate,
    isSaving: saveMutation.isPending || resetMutation.isPending,
  };
}
