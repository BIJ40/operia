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
          debug: {
            totalProjects: 0,
            projectsEligibleState: 0,
            projectsAvecRT: 0,
            rtBlocksCount: 0,
            interventionsTotal: 0,
            interventionsIndexed: 0,
            devisTotal: 0,
            devisIndexed: 0,
            devisMatchedToProjects: 0,
            devisHTCalculated: 0,
            caPlanifieDevisCount: 0,
            sampleDevis: null,
          },
        };
      }

      const services = getGlobalApogeeDataServices();

      // NB: le DataService charge un snapshot complet (cache). On applique le filtre période côté front.
      const allProjects = await services.getProjects(agencySlug, dateRange);
      const allInterventions = await services.getInterventions(agencySlug, dateRange);
      const allDevis = await services.getDevis(agencySlug, dateRange);

      const startMs = dateRange.start.getTime();
      const endMs = dateRange.end.getTime();

      const toDate = (v: unknown): Date | null => {
        if (!v) return null;
        if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
        if (typeof v === 'number') {
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        }
        if (typeof v === 'string') {
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        }
        return null;
      };

      const isInRange = (d: Date) => {
        const t = d.getTime();
        return t >= startMs && t <= endMs;
      };

      const getInterventionDates = (itv: any): Date[] => {
        const dates: Date[] = [];

        const direct = toDate(itv?.dateReelle ?? itv?.date ?? itv?.createdAt ?? itv?.created_at);
        if (direct) dates.push(direct);

        const visites = Array.isArray(itv?.visites) ? itv.visites : [];
        for (const v of visites) {
          const dv = toDate(v?.dateReelle ?? v?.date);
          if (dv) dates.push(dv);
        }

        return dates;
      };

      const getProjectId = (obj: any): number | null => {
        const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id;
        if (raw == null) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      };

      // Filtrer les interventions dont (date ou visite.date) est dans la période
      const interventions = (allInterventions || []).filter((itv: any) => {
        const dates = getInterventionDates(itv);
        return dates.some(isInRange);
      });

      // Pour que le nombre de dossiers fluctue aussi : ne garder que les projets ayant au moins 1 intervention dans la période
      const projectIdsInPeriod = new Set<number>();
      for (const itv of interventions) {
        const pid = getProjectId(itv);
        if (pid != null) projectIdsInPeriod.add(pid);
      }

      const projects = (allProjects || []).filter((p: any) => {
        const pid = Number(p?.id);
        return Number.isFinite(pid) && projectIdsInPeriod.has(pid);
      });

      const devis = (allDevis || []).filter((d: any) => {
        const pid = getProjectId(d);
        return pid != null && projectIdsInPeriod.has(pid);
      });

      return computeChargeTravauxAvenirParUnivers(projects, interventions, devis);
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export type { ChargeTravauxResult, ChargeTravauxProjet, ChargeTravauxUniversStats, ChargeParEtatStats } from '../shared/chargeTravauxEngine';
