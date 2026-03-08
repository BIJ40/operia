/**
 * Hook MesIndicateursCard migré vers StatIA
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useProfile } from '@/contexts/ProfileContext';
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { logDebug, logError } from "@/lib/logger";

interface MesIndicateursData {
  caTotal: number;
  tauxSAV: number;
  delaiMoyen: number;
  nbProjets: number;
}

export function useMesIndicateursStatia() {
  const { agence } = useProfile();
  const { isAgencyReady, currentAgency } = useAgency();
  
  const agencySlug = currentAgency?.id || agence || '';
  const services = getGlobalApogeeDataServices();

  // Période: année en cours
  const now = new Date();
  const dateRange = {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };

  return useQuery<MesIndicateursData | null>({
    queryKey: ["mes-indicateurs-statia", agencySlug, now.getFullYear()],
    enabled: !!agencySlug && isAgencyReady,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MesIndicateursData | null> => {
      logDebug('MES_INDICATEURS', `Chargement StatIA pour ${agencySlug}`);
      
      try {
        const [caResult, savResult, delaiResult, dossiersResult] = await Promise.all([
          getMetricForAgency('ca_global_ht', agencySlug, { dateRange }, services),
          getMetricForAgency('taux_sav_global', agencySlug, { dateRange }, services),
          getMetricForAgency('delai_moyen_facturation', agencySlug, { dateRange }, services),
          getMetricForAgency('nombre_dossiers', agencySlug, { dateRange }, services),
        ]);

        return {
          caTotal: Number(caResult.value) || 0,
          tauxSAV: Number(savResult.value) || 0,
          delaiMoyen: Number(delaiResult.value) || 0,
          nbProjets: Number(dossiersResult.value) || 0,
        };
      } catch (error) {
        logError('MES_INDICATEURS', 'Erreur StatIA', { error });
        return null;
      }
    },
  });
}
