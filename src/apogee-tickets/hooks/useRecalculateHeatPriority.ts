/**
 * Hook pour recalculer en masse les priorités thermiques des tickets
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateHeatPriority } from '../utils/heatPriorityCalculation';
import { logError } from '@/lib/logger';

export function useRecalculateHeatPriority() {
  const queryClient = useQueryClient();

  const recalculateAll = useMutation({
    mutationFn: async () => {
      // Récupérer tous les tickets
      const { data: tickets, error: fetchError } = await supabase
        .from('apogee_tickets')
        .select('id, source_sheet, priority');

      if (fetchError) throw fetchError;
      if (!tickets || tickets.length === 0) {
        return { updated: 0 };
      }

      let updated = 0;
      const batchSize = 50;

      // Traiter par batches
      for (let i = 0; i < tickets.length; i += batchSize) {
        const batch = tickets.slice(i, i + batchSize);
        
        const updates = batch.map(ticket => ({
          id: ticket.id,
          heat_priority: calculateHeatPriority(ticket.source_sheet, ticket.priority),
        }));

        // Mettre à jour chaque ticket du batch
        for (const update of updates) {
          const { error } = await supabase
            .from('apogee_tickets')
            .update({ heat_priority: update.heat_priority })
            .eq('id', update.id);

          if (!error) updated++;
        }
      }

      return { updated, total: tickets.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.updated} tickets mis à jour sur ${data.total || data.updated}`);
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
    },
    onError: (error) => {
      logError('APOGEE_TICKETS', 'Erreur recalcul heat_priority', { error });
      toast.error('Erreur lors du recalcul des priorités');
    },
  });

  return {
    recalculateAll: recalculateAll.mutate,
    isRecalculating: recalculateAll.isPending,
  };
}
