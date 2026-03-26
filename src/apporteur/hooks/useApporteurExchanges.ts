/**
 * useApporteurExchanges — Hook pour lire/poster des échanges sur un dossier
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApporteurApi } from './useApporteurApi';

export interface DossierExchange {
  id: string;
  sender_type: 'apporteur' | 'agence';
  sender_name: string;
  action_type: 'annuler' | 'relancer' | 'info' | 'reponse';
  message: string;
  created_at: string;
}

export function useApporteurExchanges(dossierRef: string | null) {
  const { post } = useApporteurApi();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['apporteur-exchanges', dossierRef],
    queryFn: async (): Promise<DossierExchange[]> => {
      if (!dossierRef) return [];
      const result = await post<{ success: boolean; data?: DossierExchange[]; error?: string }>(
        '/get-apporteur-exchanges',
        { dossierRef }
      );
      if (result.error) return [];
      return result.data?.data || [];
    },
    enabled: !!dossierRef,
    staleTime: 30_000,
    refetchInterval: 30_000, // Poll every 30s for new messages
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['apporteur-exchanges', dossierRef] });
  };

  return { ...query, invalidate };
}
