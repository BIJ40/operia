/**
 * useZonesDeplacement - Hook pour charger les zones BTP mensuelles par technicien
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

export const ZONE_LABELS = ['1A', '1B', '2', '3', '4', '5'] as const;
export type ZoneLabel = typeof ZONE_LABELS[number];

export interface TechZoneSummary {
  techId: number;
  techName: string;
  zones: Record<ZoneLabel, number>;
  total: number;
  paniers: number;
  paniersExclus: number;
}

interface UseZonesDeplacementOptions {
  month: string; // "YYYY-MM"
}

export function useZonesDeplacement({ month }: UseZonesDeplacementOptions) {
  const { agence } = useProfile();

  return useQuery({
    queryKey: ['zones-deplacement', month, agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('get-zones-deplacement', {
        body: { month, agencySlug: agence },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du chargement');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      return result.data as TechZoneSummary[];
    },
    enabled: !!agence && !!month,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
