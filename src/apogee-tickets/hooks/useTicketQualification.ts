/**
 * Hook pour la qualification IA des tickets Apogée
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QualificationResult {
  success: boolean;
  qualified: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

export function useTicketQualification() {
  const queryClient = useQueryClient();

  const qualifyMutation = useMutation({
    mutationFn: async (ticketIds: string[]): Promise<QualificationResult> => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('qualify-ticket', {
        body: { 
          ticket_ids: ticketIds,
          user_id: user?.id 
        }
      });

      if (error) {
        // Handle rate limit and payment errors
        if (error.message?.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
        }
        if (error.message?.includes('402')) {
          throw new Error('Crédits IA insuffisants. Veuillez recharger votre compte.');
        }
        throw error;
      }

      return data as QualificationResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      
      if (data.failed === 0) {
        toast.success(`${data.qualified} ticket(s) qualifié(s) avec succès`);
      } else {
        toast.warning(`${data.qualified} qualifié(s), ${data.failed} échec(s)`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la qualification');
    },
  });

  // Qualifier un seul ticket
  const qualifyOne = (ticketId: string) => {
    return qualifyMutation.mutateAsync([ticketId]);
  };

  // Qualifier plusieurs tickets
  const qualifyMany = (ticketIds: string[]) => {
    return qualifyMutation.mutateAsync(ticketIds);
  };

  // Qualifier tous les tickets non qualifiés
  const qualifyAllUnqualified = async () => {
    const { data: unqualified } = await supabase
      .from('apogee_tickets')
      .select('id')
      .eq('is_qualified', false);

    if (!unqualified || unqualified.length === 0) {
      toast.info('Aucun ticket à qualifier');
      return;
    }

    const ids = unqualified.map(t => t.id);
    
    // Traiter par lots de 5 pour éviter les timeouts
    const BATCH_SIZE = 5;
    let totalQualified = 0;
    let totalFailed = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      try {
        const result = await qualifyMutation.mutateAsync(batch);
        totalQualified += result.qualified;
        totalFailed += result.failed;
      } catch (error) {
        totalFailed += batch.length;
      }
    }

    toast.success(`Qualification terminée: ${totalQualified} OK, ${totalFailed} échecs`);
  };

  return {
    qualifyOne,
    qualifyMany,
    qualifyAllUnqualified,
    isQualifying: qualifyMutation.isPending,
  };
}
