/**
 * Hook to dispatch webhook for a realisation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDispatchWebhook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (realisationId: string) => {
      const { data, error } = await supabase.functions.invoke('dispatch-realisation-webhook', {
        body: { realisation_id: realisationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, realisationId) => {
      qc.invalidateQueries({ queryKey: ['realisation', realisationId] });
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Envoyé au moteur de contenu');
    },
    onError: (err: Error) => {
      toast.error(`Échec envoi: ${err.message}`);
    },
  });
}
