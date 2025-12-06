/**
 * Hook pour gérer les données sensibles des collaborateurs (RGPD)
 * Les données sont chiffrées avec AES-256-GCM via Edge Function
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export interface SensitiveData {
  birth_date: string | null;
  social_security_number: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
}

const DEFAULT_SENSITIVE_DATA: SensitiveData = {
  birth_date: null,
  social_security_number: null,
  emergency_contact: null,
  emergency_phone: null,
};

export function useSensitiveData(collaboratorId: string | undefined) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sensitive-data', collaboratorId],
    queryFn: async (): Promise<SensitiveData> => {
      if (!collaboratorId) {
        return DEFAULT_SENSITIVE_DATA;
      }

      const { data, error } = await supabase.functions.invoke('sensitive-data', {
        body: {
          action: 'read',
          collaboratorId,
        },
      });

      if (error) {
        logError('[useSensitiveData] Error fetching:', error);
        throw error;
      }

      return data || DEFAULT_SENSITIVE_DATA;
    },
    enabled: !!collaboratorId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      collaboratorId,
      data,
    }: {
      collaboratorId: string;
      data: Partial<SensitiveData>;
    }) => {
      const { error } = await supabase.functions.invoke('sensitive-data', {
        body: {
          action: 'write',
          collaboratorId,
          data,
        },
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sensitive-data', variables.collaboratorId] });
      toast.success('Données sensibles mises à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur données sensibles: ${error.message}`);
    },
  });

  return {
    sensitiveData: data || DEFAULT_SENSITIVE_DATA,
    isLoading,
    error,
    updateSensitiveData: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// Fonction utilitaire pour sauvegarder les données sensibles lors de la création/mise à jour d'un collaborateur
export async function saveSensitiveData(
  collaboratorId: string,
  data: Partial<SensitiveData>
): Promise<void> {
  const { error } = await supabase.functions.invoke('sensitive-data', {
    body: {
      action: 'write',
      collaboratorId,
      data,
    },
  });

  if (error) throw error;
}
