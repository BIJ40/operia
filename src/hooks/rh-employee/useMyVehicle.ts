/**
 * Hook pour récupérer le véhicule assigné au collaborateur connecté (N1)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCollaborator } from './useMyCollaborator';
import { safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { FleetVehicle } from '@/types/maintenance';

export function useMyVehicle() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();

  return useQuery({
    queryKey: ['my-vehicle', collaborator?.id],
    queryFn: async (): Promise<FleetVehicle | null> => {
      if (!collaborator?.id) return null;

      const result = await safeQuery<FleetVehicle[]>(
        supabase
          .from('fleet_vehicles')
          .select('*')
          .eq('assigned_collaborator_id', collaborator.id)
          .limit(1),
        'MY_VEHICLE_FETCH'
      );

      if (!result.success) {
        logError('[useMyVehicle] Erreur fetch', result.error);
        return null;
      }

      return result.data?.[0] || null;
    },
    enabled: !!collaborator?.id && !loadingCollaborator,
  });
}
