/**
 * useApporteurDossierActions - Hook pour les actions sur dossiers (refus devis, facture réglée, dossier inactif)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApporteurApi } from './useApporteurApi';
import { toast } from 'sonner';

type ActionType = 'refuser_devis' | 'valider_devis' | 'facture_reglee' | 'dossier_inactif';
type InactifAction = 'annuler' | 'relancer' | 'donner_info';

interface ActionPayload {
  action: ActionType;
  dossierRefs: string[];
  dateReglement?: string;
  typeReglement?: string;
  inactifAction?: InactifAction;
  message?: string;
}

export function useApporteurDossierActions() {
  const { post } = useApporteurApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ActionPayload) => {
      const result = await post('/apporteur-dossier-action', payload);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      const messages: Record<ActionType, string> = {
        refuser_devis: 'Refus de devis notifié à l\'agence',
        valider_devis: 'Validation de devis notifiée à l\'agence',
        facture_reglee: 'Règlement de facture notifié à l\'agence',
        dossier_inactif: 'Demande envoyée à l\'agence',
      };
      toast.success(messages[variables.action]);
      queryClient.invalidateQueries({ queryKey: ['apporteur-dossiers'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export type { ActionType, InactifAction, ActionPayload };
