/**
 * StatIA V2 - Hook pour la comparaison de périodes
 * Remplace usePeriodComparison legacy par des calculs StatIA
 */

import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { supabase } from '@/integrations/supabase/client';
import { NetworkDataService } from '../services/networkDataService';
import { extractFactureMeta } from '@/statia/rules/rules';
import { isFactureStateIncluded } from '@/statia/engine/normalizers';
import { logNetwork, logError } from '@/lib/logger';

interface PeriodKPIs {
  ca: number;
  projects: number;
  interventions: number;
  savRate: number;
}

interface PeriodComparisonResult {
  period1: PeriodKPIs;
  period2: PeriodKPIs;
  isLoading: boolean;
  error: Error | null;
}

interface PeriodParams {
  type: 'month' | 'year';
  year: number;
  month?: number;
}

const DEFAULT_KPIS: PeriodKPIs = { ca: 0, projects: 0, interventions: 0, savRate: 0 };

function buildDateRange(params: PeriodParams): { start: Date; end: Date } {
  if (params.type === 'year') {
    return {
      start: new Date(params.year, 0, 1),
      end: new Date(params.year, 11, 31, 23, 59, 59),
    };
  }
  const month = params.month ?? 0;
  return {
    start: new Date(params.year, month, 1),
    end: new Date(params.year, month + 1, 0, 23, 59, 59),
  };
}

function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isInterventionRealisee(intervention: any): boolean {
  const state = (intervention.state || intervention.statut || intervention.data?.state || '').toLowerCase();
  return ['done', 'finished', 'validated', 'completed', 'réalisée', 'terminée'].includes(state);
}

function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase();
  const type = (intervention.data?.type || intervention.type || '').toLowerCase();
  return type2.includes('sav') || type.includes('sav');
}

function computePeriodKPIs(
  factures: any[],
  projects: any[],
  interventions: any[],
  range: { start: Date; end: Date }
): PeriodKPIs {
  // CA via StatIA rules (extractFactureMeta + isFactureStateIncluded)
  let ca = 0;
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    const factureState = facture.state || facture.status || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < range.start || date > range.end) continue;
    ca += meta.montantNetHT;
  }

  // Projects sur période
  let projectCount = 0;
  for (const project of projects) {
    const date = parseDate(project.date || project.created_at || project.createdAt);
    if (!date || date < range.start || date > range.end) continue;
    projectCount++;
  }

  // Interventions sur période
  let interventionCount = 0;
  for (const intervention of interventions) {
    if (!isInterventionRealisee(intervention)) continue;
    const date = parseDate(intervention.dateReelle || intervention.date || intervention.created_at);
    if (!date || date < range.start || date > range.end) continue;
    interventionCount++;
  }

  // Taux SAV sur période
  const projectsWithSAV = new Set<any>();
  for (const intervention of interventions) {
    if (isSAVIntervention(intervention)) {
      const projectId = intervention.projectId || intervention.project_id;
      if (projectId) projectsWithSAV.add(projectId);
    }
  }

  let totalDossiersForSAV = 0;
  let savDossiers = 0;
  for (const project of projects) {
    const date = parseDate(project.date || project.created_at || project.createdAt);
    if (!date || date < range.start || date > range.end) continue;
    totalDossiersForSAV++;
    if (projectsWithSAV.has(project.id)) savDossiers++;
  }
  const savRate = totalDossiersForSAV > 0 ? (savDossiers / totalDossiersForSAV) * 100 : 0;

  return {
    ca,
    projects: projectCount,
    interventions: interventionCount,
    savRate: Math.round(savRate * 10) / 10,
  };
}

export function usePeriodComparisonStatia(
  period1: PeriodParams,
  period2: PeriodParams
): PeriodComparisonResult {
  const { franchiseurRole } = useFranchiseur();

  const queryKey = [
    'statia-period-comparison',
    period1.type,
    period1.year,
    period1.month,
    period2.type,
    period2.year,
    period2.month,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ period1: PeriodKPIs; period2: PeriodKPIs }> => {
      logNetwork.info('[StatIA] Chargement comparaison de périodes...');

      try {
        // Get all active agencies
        const { data: agencies, error: agenciesError } = await supabase
          .from('apogee_agencies')
          .select('id, slug, label')
          .eq('is_active', true);

        if (agenciesError || !agencies?.length) {
          logError('[StatIA] Erreur chargement agences', agenciesError);
          return { period1: DEFAULT_KPIS, period2: DEFAULT_KPIS };
        }

        logNetwork.debug(`[StatIA] Chargement de ${agencies.length} agences...`);

        // Charger toutes les agences séquentiellement
        const allFactures: any[] = [];
        const allProjects: any[] = [];
        const allInterventions: any[] = [];

        for (const agency of agencies) {
          const data = await NetworkDataService.loadAgencyData(agency.slug);
          if (data) {
            allFactures.push(...(data.factures || []));
            allProjects.push(...(data.projects || []));
            allInterventions.push(...(data.interventions || []));
          }
        }

        logNetwork.info(`[StatIA] ${agencies.length} agences chargées`);

        // Calculer KPIs pour chaque période
        const range1 = buildDateRange(period1);
        const range2 = buildDateRange(period2);

        const kpis1 = computePeriodKPIs(allFactures, allProjects, allInterventions, range1);
        const kpis2 = computePeriodKPIs(allFactures, allProjects, allInterventions, range2);

        return { period1: kpis1, period2: kpis2 };
      } catch (err) {
        logError('[StatIA] Erreur comparaison périodes', err);
        return { period1: DEFAULT_KPIS, period2: DEFAULT_KPIS };
      }
    },
    enabled: !!franchiseurRole,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    period1: data?.period1 ?? DEFAULT_KPIS,
    period2: data?.period2 ?? DEFAULT_KPIS,
    isLoading,
    error: error as Error | null,
  };
}
