/**
 * Hook pour récupérer le matériel assigné au collaborateur connecté (N1)
 * Lit la colonne autres_equipements (JSONB) de rh_assets
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCollaborator } from './useMyCollaborator';
import { logError } from '@/lib/logger';

export interface MyEquipmentItem {
  id: string;
  nom: string;
  categorie: 'informatique' | 'outils';
  numero_serie?: string | null;
  imei?: string | null;
  notes?: string | null;
}

export function useMyEquipment() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();

  return useQuery({
    queryKey: ['my-equipment', collaborator?.id],
    queryFn: async (): Promise<MyEquipmentItem[]> => {
      if (!collaborator?.id) return [];

      const { data, error } = await supabase
        .from('rh_assets')
        .select('autres_equipements')
        .eq('collaborator_id', collaborator.id)
        .maybeSingle();

      if (error) {
        logError('[useMyEquipment] Erreur fetch', error);
        return [];
      }

      if (!data?.autres_equipements) return [];

      // Parse JSONB array
      const equipements = data.autres_equipements as unknown as MyEquipmentItem[];
      return Array.isArray(equipements) ? equipements : [];
    },
    enabled: !!collaborator?.id && !loadingCollaborator,
  });
}
