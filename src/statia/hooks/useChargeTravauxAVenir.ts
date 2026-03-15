/**
 * Hook pour calculer la charge de travaux à venir par univers
 * 
 * Règle métier:
 * - Les KPIs "À planifier TVX", "À commander", "En attente fournitures" sont GLOBAUX (pas de filtre période)
 * - Seul le "CA Planifié" (devis acceptés avec intervention planifiée) est filtré par période
 */

import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { computeChargeTravauxAvenirParUnivers, ChargeTravauxResult } from '../shared/chargeTravauxEngine';
import { useMemo } from 'react';

// Helper functions
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

const getProjectId = (obj: any): number | null => {
  const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const getInterventionPlanningDate = (itv: any): Date | null => {
  const direct = toDate(itv?.dateReelle ?? itv?.date);
  if (direct) return direct;
  const visites = Array.isArray(itv?.visites) ? itv.visites : [];
  for (const v of visites) {
    const dv = toDate(v?.dateReelle ?? v?.date);
    if (dv) return dv;
  }
  return null;
};

const isDevisToOrder = (d: any): boolean => {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '').trim().toLowerCase();
  return state === 'to order' || state === 'to_order' || state === 'order';
};

const parseNumericValue = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export function useChargeTravauxAVenir() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  const agencySlug = currentAgency?.id;
  const dateRange = filters.dateRange;

  // Query 1: Stats GLOBALES (queryKey stable, ne change pas avec la période)
  const globalQuery = useQuery({
    queryKey: ['charge-travaux-global', agencySlug],
    queryFn: async () => {
      if (!agencySlug) return null;
      const services = getGlobalApogeeDataServices();
      const [projects, interventions, devis, factures, users] = await Promise.all([
        services.getProjects(agencySlug, undefined),
        services.getInterventions(agencySlug, undefined),
        services.getDevis(agencySlug, undefined),
        services.getFactures(agencySlug, undefined),
        services.getUsers(agencySlug),
      ]);
      return { projects, interventions, devis, factures, users };
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 1000 * 60 * 5,
  });

  // Calculer les stats globales à partir des données brutes (avec users pour enrichment)
  const globalStats = useMemo(() => {
    if (!globalQuery.data) return null;
    const { projects, interventions, devis, users } = globalQuery.data;
    return computeChargeTravauxAvenirParUnivers(projects, interventions, devis, users);
  }, [globalQuery.data]);

  // Calculer le CA Planifié filtré par période (côté client, pas de refetch)
  const caPlanifieData = useMemo(() => {
    if (!globalQuery.data) return { caPlanifie: 0, caPlanifieDevisCount: 0 };
    
    const { projects, interventions, devis, factures } = globalQuery.data;
    const startMs = dateRange.start.getTime();
    const endMs = dateRange.end.getTime();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const isInRangeAndFuture = (d: Date) => {
      const t = d.getTime();
      return t >= startMs && t <= endMs && t >= todayMs;
    };

    const facturedProjectIds = new Set<number>();
    for (const f of factures) {
      const pid = getProjectId(f);
      if (pid != null) facturedProjectIds.add(pid);
    }

    const interventionsByProjectId = new Map<number, any[]>();
    for (const itv of interventions) {
      const pid = getProjectId(itv);
      if (pid == null) continue;
      if (!interventionsByProjectId.has(pid)) interventionsByProjectId.set(pid, []);
      interventionsByProjectId.get(pid)!.push(itv);
    }

    const devisByProjectId = new Map<number, any[]>();
    for (const d of devis) {
      const pid = getProjectId(d);
      if (pid == null) continue;
      if (!devisByProjectId.has(pid)) devisByProjectId.set(pid, []);
      devisByProjectId.get(pid)!.push(d);
    }

    let caPlanifie = 0;
    let caPlanifieDevisCount = 0;

    for (const project of projects) {
      const projectId = Number(project?.id);
      if (!Number.isFinite(projectId)) continue;
      if (facturedProjectIds.has(projectId)) continue;

      const projectInterventions = interventionsByProjectId.get(projectId) || [];
      const hasInterventionInPeriod = projectInterventions.some((itv) => {
        const planningDate = getInterventionPlanningDate(itv);
        return planningDate && isInRangeAndFuture(planningDate);
      });

      if (!hasInterventionInPeriod) continue;

      const projectDevis = devisByProjectId.get(projectId) || [];
      for (const d of projectDevis) {
        if (!isDevisToOrder(d)) continue;
        const montant =
          parseNumericValue(d.data?.totalHT) ||
          parseNumericValue(d.totalHT) ||
          parseNumericValue(d.amount) ||
          0;
        if (montant > 0) {
          caPlanifie += montant;
          caPlanifieDevisCount++;
          break;
        }
      }
    }

    return { caPlanifie, caPlanifieDevisCount };
  }, [globalQuery.data, dateRange.start, dateRange.end]);

  // Combiner les résultats
  const data = useMemo((): ChargeTravauxResult | undefined => {
    if (!globalStats) return undefined;
    return {
      ...globalStats,
      totaux: {
        ...globalStats.totaux,
        caPlanifie: caPlanifieData.caPlanifie,
      },
      debug: {
        ...globalStats.debug,
        caPlanifieDevisCount: caPlanifieData.caPlanifieDevisCount,
      },
    };
  }, [globalStats, caPlanifieData]);

  return {
    data,
    rawData: globalQuery.data,
    isLoading: globalQuery.isLoading,
    isError: globalQuery.isError,
    error: globalQuery.error,
  };
}

export type {
  ChargeTravauxResult,
  ChargeTravauxProjet,
  ChargeTravauxUniversStats,
  ChargeParEtatStats,
  ChargeTechnicien,
  PipelineAgeBucket,
  ChargeParSemaine,
  DataQualityFlag,
  PipelineMaturity,
} from '../shared/chargeTravauxEngine';
