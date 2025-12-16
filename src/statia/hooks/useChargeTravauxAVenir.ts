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

export function useChargeTravauxAVenir() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  const agencySlug = currentAgency?.id;

  // Utiliser les dates du filtre pour le CA Planifié uniquement
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

      // Charger TOUTES les données (pas de filtre période côté API)
      const projects = await services.getProjects(agencySlug, undefined);
      const interventions = await services.getInterventions(agencySlug, undefined);
      const devis = await services.getDevis(agencySlug, undefined);

      // Calculer les stats globales (tous les KPIs sauf CA Planifié)
      const globalResult = computeChargeTravauxAvenirParUnivers(projects, interventions, devis);

      // Maintenant calculer le CA Planifié filtré par période
      // Le CA Planifié = devis "to order" dont l'intervention est planifiée dans la période sélectionnée
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

      // Extraire la date de planification d'une intervention (dateReelle ou date de visite)
      const getInterventionPlanningDate = (itv: any): Date | null => {
        // Priorité: dateReelle de l'intervention, puis date, puis première visite avec date
        const direct = toDate(itv?.dateReelle ?? itv?.date);
        if (direct) return direct;

        const visites = Array.isArray(itv?.visites) ? itv.visites : [];
        for (const v of visites) {
          const dv = toDate(v?.dateReelle ?? v?.date);
          if (dv) return dv;
        }

        return null;
      };

      const getProjectId = (obj: any): number | null => {
        const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id;
        if (raw == null) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      };

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

      // Calculer le CA Planifié filtré par période
      // Un projet contribue au CA planifié de la période si:
      // 1. Il a un devis "to order" (accepté)
      // 2. Il a une intervention planifiée dans la période sélectionnée
      let caPlanifiePeriode = 0;
      let caPlanifieDevisCountPeriode = 0;

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

      for (const project of projects) {
        const projectId = Number(project?.id);
        if (!Number.isFinite(projectId)) continue;

        // Vérifier si ce projet a une intervention planifiée dans la période
        const projectInterventions = interventionsByProjectId.get(projectId) || [];
        const hasInterventionInPeriod = projectInterventions.some((itv) => {
          const planningDate = getInterventionPlanningDate(itv);
          return planningDate && isInRange(planningDate);
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
            caPlanifiePeriode += montant;
            caPlanifieDevisCountPeriode++;
            break; // 1 seul devis to_order par projet
          }
        }
      }

      // Retourner les stats globales avec le CA Planifié filtré par période
      return {
        ...globalResult,
        totaux: {
          ...globalResult.totaux,
          caPlanifie: caPlanifiePeriode,
        },
        debug: {
          ...globalResult.debug,
          caPlanifieDevisCount: caPlanifieDevisCountPeriode,
        },
      };
    },
    enabled: isAgencyReady && !!agencySlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export type { ChargeTravauxResult, ChargeTravauxProjet, ChargeTravauxUniversStats, ChargeParEtatStats } from '../shared/chargeTravauxEngine';
