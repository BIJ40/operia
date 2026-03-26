/**
 * useAgencyDossierReply — Hook pour envoyer une réponse agence dans le fil d'échanges
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReplyParams {
  dossierRef: string;
  message: string;
}

export function useAgencyDossierReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dossierRef, message }: ReplyParams) => {
      const { data, error } = await supabase.functions.invoke('agency-dossier-reply', {
        body: { dossierRef, message },
      });

      if (error) throw new Error(error.message || 'Erreur lors de l\'envoi');
      if (data && !data.success) throw new Error(data.error || 'Erreur lors de l\'envoi');

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Message envoyé');
      queryClient.invalidateQueries({ queryKey: ['apporteur-exchanges', variables.dossierRef] });
      queryClient.invalidateQueries({ queryKey: ['agency-exchanges'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi du message');
    },
  });
}
