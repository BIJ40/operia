/**
 * Hook pour calculer la charge de travaux à venir par univers
 */

import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { computeChargeTravauxAvenirParUnivers, ChargeTravauxResult } from '../shared/chargeTravauxEngine';

export function useChargeTravauxAVenir() {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.id;

  return useQuery({
    queryKey: ['charge-travaux-a-venir', agencySlug],
    queryFn: async (): Promise<ChargeTravauxResult> => {
      if (!agencySlug) {
        return {
          parUnivers: [],
          parProjet: [],
          totaux: { totalHeuresRdv: 0, totalHeuresTech: 0, nbDossiers: 0 },
          debug: { totalProjects: 0, projectsEligibleState: 0, projectsAvecRT: 0, rtBlocksCount: 0 }
        };
      }

      const services = getGlobalApogeeDataServices();
      
      // Charger tous les projets (sans filtre de date car on veut l'état actuel)
      const projects = await services.getProjects(agencySlug, undefined);
      
      // Charger toutes les interventions
      const interventions = await services.getInterventions(agencySlug, undefined);

      return computeChargeTravauxAvenirParUnivers(projects, interventions);
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export type { ChargeTravauxResult, ChargeTravauxProjet, ChargeTravauxUniversStats } from '../shared/chargeTravauxEngine';
