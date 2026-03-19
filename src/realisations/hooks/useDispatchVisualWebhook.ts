/**
 * Hook to dispatch a single before/after visual via webhook with AVAP label
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDispatchVisualWebhook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, realisationId }: { mediaId: string; realisationId: string }) => {
      const { data, error } = await supabase.functions.invoke('dispatch-realisation-webhook', {
        body: { realisation_id: realisationId, media_id: mediaId, label_override: 'AVAP' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, { realisationId }) => {
      qc.invalidateQueries({ queryKey: ['realisation', realisationId] });
      qc.invalidateQueries({ queryKey: ['realisations'] });
      qc.invalidateQueries({ queryKey: ['generated-visuals'] });
      toast.success('Visuel Avant/Après envoyé avec le tag AVAP');
    },
    onError: (err: Error) => {
      toast.error(`Échec envoi: ${err.message}`);
    },
  });
}
