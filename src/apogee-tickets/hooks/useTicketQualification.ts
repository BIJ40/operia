/**
 * Hook pour la qualification IA des tickets Apogée
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast, warningToast, infoToast } from '@/lib/toastHelpers';

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

      const result = await safeInvoke<QualificationResult>(
        supabase.functions.invoke('qualify-ticket', {
          body: { 
            ticket_ids: ticketIds,
            user_id: user?.id 
          }
        }),
        'TICKET_QUALIFY'
      );

      if (!result.success) {
        const errorMsg = result.error?.message || '';
        if (errorMsg.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
        }
        if (errorMsg.includes('402')) {
          throw new Error('Crédits IA insuffisants. Veuillez recharger votre compte.');
        }
        throw new Error(result.error?.message || 'Erreur qualification');
      }

      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      
      if (data.failed === 0) {
        successToast(`${data.qualified} ticket(s) qualifié(s) avec succès`);
      } else {
        warningToast(`${data.qualified} qualifié(s), ${data.failed} échec(s)`);
      }
    },
    onError: (error: Error) => {
      errorToast(error.message || 'Erreur lors de la qualification');
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
    const result = await safeQuery<{ id: string }[]>(
      supabase
        .from('apogee_tickets')
        .select('id')
        .eq('is_qualified', false),
      'TICKETS_UNQUALIFIED_LOAD'
    );

    if (!result.success || !result.data || result.data.length === 0) {
      infoToast('Aucun ticket à qualifier');
      return;
    }

    const ids = result.data.map(t => t.id);
    
    // Traiter par lots de 5 pour éviter les timeouts
    const BATCH_SIZE = 5;
    let totalQualified = 0;
    let totalFailed = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      try {
        const batchResult = await qualifyMutation.mutateAsync(batch);
        totalQualified += batchResult.qualified;
        totalFailed += batchResult.failed;
      } catch {
        totalFailed += batch.length;
      }
    }

    successToast(`Qualification terminée: ${totalQualified} OK, ${totalFailed} échecs`);
  };

  return {
    qualifyOne,
    qualifyMany,
    qualifyAllUnqualified,
    isQualifying: qualifyMutation.isPending,
  };
}
