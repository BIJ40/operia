/**
 * Hook pour gérer les données sensibles des collaborateurs (RGPD)
 * Les données sont stockées dans collaborator_sensitive_data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SensitiveData {
  birth_date: string | null;
  social_security_number: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
}

interface SensitiveDataRow {
  id: string;
  collaborator_id: string;
  birth_date_encrypted: string | null;
  social_security_number_encrypted: string | null;
  emergency_contact_encrypted: string | null;
  emergency_phone_encrypted: string | null;
}

// Note: Pour l'instant les données sont stockées en clair dans les colonnes _encrypted
// Un vrai chiffrement sera implémenté via Edge Function plus tard
function decryptData(row: SensitiveDataRow | null): SensitiveData {
  if (!row) {
    return {
      birth_date: null,
      social_security_number: null,
      emergency_contact: null,
      emergency_phone: null,
    };
  }
  return {
    birth_date: row.birth_date_encrypted,
    social_security_number: row.social_security_number_encrypted,
    emergency_contact: row.emergency_contact_encrypted,
    emergency_phone: row.emergency_phone_encrypted,
  };
}

export function useSensitiveData(collaboratorId: string | undefined) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sensitive-data', collaboratorId],
    queryFn: async (): Promise<SensitiveData> => {
      if (!collaboratorId) {
        return decryptData(null);
      }

      const { data, error } = await supabase
        .from('collaborator_sensitive_data')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .maybeSingle();

      if (error) throw error;
      return decryptData(data as SensitiveDataRow | null);
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
      // Upsert - insert or update
      const { error } = await supabase
        .from('collaborator_sensitive_data')
        .upsert(
          {
            collaborator_id: collaboratorId,
            birth_date_encrypted: data.birth_date || null,
            social_security_number_encrypted: data.social_security_number || null,
            emergency_contact_encrypted: data.emergency_contact || null,
            emergency_phone_encrypted: data.emergency_phone || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'collaborator_id' }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sensitive-data', variables.collaboratorId] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur données sensibles: ${error.message}`);
    },
  });

  return {
    sensitiveData: data || decryptData(null),
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
  const { error } = await supabase
    .from('collaborator_sensitive_data')
    .upsert(
      {
        collaborator_id: collaboratorId,
        birth_date_encrypted: data.birth_date || null,
        social_security_number_encrypted: data.social_security_number || null,
        emergency_contact_encrypted: data.emergency_contact || null,
        emergency_phone_encrypted: data.emergency_phone || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'collaborator_id' }
    );

  if (error) throw error;
}
