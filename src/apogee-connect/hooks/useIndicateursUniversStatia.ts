/**
 * Hook Indicateurs Univers migré vers StatIA
 * Réexporte le hook StatIA unifié
 */

import { useUniversStatia, UniversStatItem } from "@/statia/hooks/useUniversStatia";
import { EnrichmentService } from "@/apogee-connect/services/enrichmentService";
import { DataService } from "@/apogee-connect/services/dataService";
import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";

export interface UniversStat {
  univers: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  nbInterventions: number;
  tauxSAV: number;
}

export function useIndicateursUniversStatia() {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.id || '';
  
  // Charger les univers de l'EnrichmentService
  const universesQuery = useQuery({
    queryKey: ["universes-enrichment", agencySlug],
    queryFn: async () => {
      const rawData = await DataService.loadAllData(true, false, agencySlug);
      EnrichmentService.initialize(rawData);
      return EnrichmentService.getAllUniverses();
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 10 * 60 * 1000,
  });

  // Utiliser le hook StatIA unifié
  const statiaQuery = useUniversStatia();

  return {
    data: statiaQuery.data ? {
      ...statiaQuery.data,
      universes: universesQuery.data || [],
    } : undefined,
    isLoading: statiaQuery.isLoading || universesQuery.isLoading,
    isError: statiaQuery.isError || universesQuery.isError,
    error: statiaQuery.error || universesQuery.error,
  };
}
