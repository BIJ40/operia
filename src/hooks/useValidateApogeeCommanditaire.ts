/**
 * Hook pour valider un commanditaire Apogée en comptant les projets associés
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ValidateResponse {
  success: boolean;
  data?: {
    projects_count: number;
    commanditaire_name?: string;
  };
  error?: string;
}

export function useValidateApogeeCommanditaire(apogeeClientId: number | null | undefined) {
  return useQuery({
    queryKey: ['validate-apogee-commanditaire', apogeeClientId],
    queryFn: async (): Promise<ValidateResponse['data']> => {
      if (!apogeeClientId) {
        return { projects_count: 0 };
      }

      const { data, error } = await supabase.functions.invoke('validate-apogee-commanditaire', {
        body: { apogee_client_id: apogeeClientId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur de validation');

      return data.data;
    },
    enabled: !!apogeeClientId && apogeeClientId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
