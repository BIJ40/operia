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
  const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id ?? obj?.refId ?? obj?.ref_id ?? obj?.dossierId ?? obj?.dossier_id ?? obj?.data?.projectId;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const getInterventionPlanningDate = (itv: any): Date | null => {
  const direct = toDate(itv?.dateReelle ?? itv?.date ?? itv?.start ?? itv?.dateDebut ?? itv?.data?.date);
  if (direct) return direct;
  const visites = [
    ...(Array.isArray(itv?.visites) ? itv.visites : []),
    ...(Array.isArray(itv?.data?.visites) ? itv.data.visites : []),
  ];
  for (const v of visites) {
    const dv = toDate(v?.dateReelle ?? v?.date ?? v?.start ?? v?.dateDebut);
    if (dv) return dv;
  }
  return null;
};

const VALID_DEVIS_STATES = new Set([
  'to order', 'to_order', 'order',
  'accepted', 'accepté', 'accepte',
  'signed', 'signé', 'signe',
  'validated', 'validé', 'valide',
  'commande', 'commandé', 'commandee', 'à commander', 'a commander',
  'devis_accepte', 'devis_valide', 'devis_accepté', 'devis_validé',
]);

const isDevisToOrder = (d: any): boolean => {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? d?.etat ?? d?.data?.etat ?? '').trim().toLowerCase();
  return VALID_DEVIS_STATES.has(state);
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
      const [projects, interventions, devis, factures, clients] = await Promise.all([
        services.getProjects(agencySlug, undefined),
        services.getInterventions(agencySlug, undefined),
        services.getDevis(agencySlug, undefined),
        services.getFactures(agencySlug, undefined),
        services.getClients(agencySlug),
      ]);
      return { projects, interventions, devis, factures, clients };
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculer les stats globales à partir des données brutes
  const globalStats = useMemo(() => {
    if (!globalQuery.data) return null;
    const { projects, interventions, devis } = globalQuery.data;
    return computeChargeTravauxAvenirParUnivers(projects, interventions, devis);
  }, [globalQuery.data]);

  // Calculer le CA Planifié filtré par période (côté client, pas de refetch)
  // Exclut les projets déjà facturés
  // N'inclut que les interventions planifiées à J+0 minimum (pas de J-)
  const caPlanifieData = useMemo(() => {
    if (!globalQuery.data) return { caPlanifie: 0, caPlanifieDevisCount: 0 };
    
    const { projects, interventions, devis, factures } = globalQuery.data;
    const startMs = dateRange.start.getTime();
    const endMs = dateRange.end.getTime();
    
    // Date du jour à minuit pour le filtre J+0 minimum
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Doit être dans la période ET >= aujourd'hui (prévisionnel uniquement)
    const isInRangeAndFuture = (d: Date) => {
      const t = d.getTime();
      return t >= startMs && t <= endMs && t >= todayMs;
    };

    // Créer un Set des projectIds déjà facturés
    const facturedProjectIds = new Set<number>();
    for (const f of factures) {
      const pid = getProjectId(f);
      if (pid != null) facturedProjectIds.add(pid);
    }

    // Indexer les interventions par projectId
    const interventionsByProjectId = new Map<number, any[]>();
    for (const itv of interventions) {
      const pid = getProjectId(itv);
      if (pid == null) continue;
      if (!interventionsByProjectId.has(pid)) interventionsByProjectId.set(pid, []);
      interventionsByProjectId.get(pid)!.push(itv);
    }

    // Indexer les devis par projectId
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

      // Exclure les projets déjà facturés
      if (facturedProjectIds.has(projectId)) continue;

      // Vérifier si ce projet a une intervention planifiée dans la période
      const projectInterventions = interventionsByProjectId.get(projectId) || [];
      const hasInterventionInPeriod = projectInterventions.some((itv) => {
        const planningDate = getInterventionPlanningDate(itv);
        return planningDate && isInRangeAndFuture(planningDate);
      });

      if (!hasInterventionInPeriod) continue;

      // Chercher un devis "to order" pour ce projet
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
          break; // 1 seul devis to_order par projet
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
    // Exposer les données brutes pour le composant CAPlanifieCard
    rawData: globalQuery.data,
    isLoading: globalQuery.isLoading,
    isError: globalQuery.isError,
    error: globalQuery.error,
  };
}

export type { ChargeTravauxResult, ChargeTravauxProjet, ChargeTravauxUniversStats, ChargeParEtatStats, DataQualityInfo, PipelineMaturityInfo, PipelineAgingInfo, RiskProjectEntry, TechnicianCharge, WeeklyLoadEntry } from '../shared/chargeTravauxEngine';
