/**
 * useProjectProfitability
 *
 * Charge les données Supabase + API Apogée, appelle le moteur,
 * et retourne le résultat de rentabilité d'un dossier.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import {
  listCostProfiles,
  listProjectCosts,
  listOverheadRules,
  getSnapshot,
  upsertSnapshot,
} from '@/repositories/profitabilityRepository';
import { computeProjectProfitability } from '@/statia/shared/projectProfitabilityEngine';
import type {
  ProfitabilityInputs,
  ProfitabilityResult,
  ProfitabilityFacture,
  ProfitabilityIntervention,
  ProfitabilitySnapshot,
} from '@/types/projectProfitability';

interface UseProjectProfitabilityOptions {
  projectId: string;
  /** Factures mapped to engine format from Apogée data */
  factures: ProfitabilityFacture[];
  /** Interventions mapped to engine format from Apogée data */
  interventions: ProfitabilityIntervention[];
  /** Whether the project is closed/invoiced */
  isProjectClosed: boolean;
  /** Auto-save snapshot after computation */
  persistSnapshot?: boolean;
  enabled?: boolean;
}

export function useProjectProfitability(options: UseProjectProfitabilityOptions) {
  const {
    projectId,
    factures,
    interventions,
    isProjectClosed,
    persistSnapshot = false,
    enabled = true,
  } = options;

  const { agencyId } = useEffectiveAuth();

  return useQuery<ProfitabilityResult | null>({
    queryKey: ['project-profitability', agencyId, projectId],
    enabled: enabled && !!agencyId && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      if (!agencyId) return null;

      // Load Supabase data in parallel
      const [costProfiles, projectCosts, overheadRules] = await Promise.all([
        listCostProfiles(agencyId),
        listProjectCosts(agencyId, projectId),
        listOverheadRules(agencyId),
      ]);

      const inputs: ProfitabilityInputs = {
        projectId,
        factures,
        interventions,
        costProfiles,
        projectCosts,
        overheadRules,
        isProjectClosed,
      };

      const result = computeProjectProfitability(inputs);

      // Optionally persist snapshot
      if (persistSnapshot) {
        try {
          const snapshotData: Omit<ProfitabilitySnapshot, 'id' | 'created_at'> = {
            agency_id: agencyId,
            project_id: projectId,
            computed_at: result.computedAt,
            ca_invoiced_ht: result.caInvoicedHT,
            ca_collected_ttc: result.caCollectedTTC,
            cost_labor: result.costLabor,
            cost_purchases: result.costPurchases,
            cost_subcontracting: result.costSubcontracting,
            cost_other: result.costOther,
            cost_overhead: result.costOverhead,
            cost_total: result.costTotal,
            gross_margin: result.grossMargin,
            net_margin: result.netMargin,
            margin_pct: result.marginPct,
            hours_total: result.hoursTotal,
            completeness_score: result.completenessScore,
            reliability_level: result.reliabilityLevel,
            flags_json: result.flags,
            validation_status: 'draft',
            created_by: null,
            apogee_data_hash: result.apogeeDataHash,
            apogee_last_sync_at: new Date().toISOString(),
            version: 1, // Managed by repository
            previous_snapshot_id: null, // Managed by repository
            validated_by: null,
            validated_at: null,
          };
          await upsertSnapshot(snapshotData);
        } catch {
          // Snapshot persistence is best-effort
        }
      }

      return result;
    },
  });
}

/** Load the last persisted snapshot without recomputing */
export function useProjectProfitabilitySnapshot(projectId: string) {
  const { agencyId } = useEffectiveAuth();

  return useQuery<ProfitabilitySnapshot | null>({
    queryKey: ['project-profitability-snapshot', agencyId, projectId],
    enabled: !!agencyId && !!projectId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => agencyId ? getSnapshot(agencyId, projectId) : null,
  });
}
