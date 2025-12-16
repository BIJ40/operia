/**
 * Hook pour calculer la charge de travaux à venir par univers
 * Supporte le filtrage par période via FiltersContext
 */

import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { computeChargeTravauxAvenirParUnivers, ChargeTravauxResult } from '../shared/chargeTravauxEngine';

export function useChargeTravauxAVenir() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  const agencySlug = currentAgency?.id;
  
  // Utiliser les dates du filtre
  const dateRange = filters.dateRange;

  return useQuery({
    queryKey: ['charge-travaux-a-venir', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<ChargeTravauxResult> => {
      if (!agencySlug) {
        return {
          parUnivers: [],
          parEtat: [],
          parProjet: [],
          totaux: { totalHeuresRdv: 0, totalHeuresTech: 0, totalNbTechs: 0, nbDossiers: 0, totalDevisHT: 0, caPlanifie: 0 },
          debug: { totalProjects: 0, projectsEligibleState: 0, projectsAvecRT: 0, rtBlocksCount: 0, interventionsTotal: 0, interventionsIndexed: 0, devisTotal: 0, devisIndexed: 0, devisMatchedToProjects: 0, devisHTCalculated: 0, caPlanifieDevisCount: 0, sampleDevis: null }
        };
      }

      const services = getGlobalApogeeDataServices();
      
      // Charger les projets avec filtre de date
      const projects = await services.getProjects(agencySlug, dateRange);
      
      // Charger les interventions avec filtre de date
      const interventions = await services.getInterventions(agencySlug, dateRange);

      // Charger les devis avec filtre de date
      const devis = await services.getDevis(agencySlug, dateRange);

      return computeChargeTravauxAvenirParUnivers(projects, interventions, devis);
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export type { ChargeTravauxResult, ChargeTravauxProjet, ChargeTravauxUniversStats, ChargeParEtatStats } from '../shared/chargeTravauxEngine';
