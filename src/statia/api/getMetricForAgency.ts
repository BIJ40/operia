/**
 * StatIA V1 - API spécifique Agence
 * Wrapper qui impose le contexte agence
 */

import { StatParams, StatResult, DateRange, SAVOverrideEntry } from '../definitions/types';
import { getMetric, getMetrics } from './getMetric';
import { ApogeeDataServices } from '../engine/loaders';

/**
 * Paramètres simplifiés pour le contexte Agence
 */
export interface AgencyMetricParams {
  dateRange: DateRange;
  groupBy?: ('univers' | 'apporteur' | 'technicien' | 'mois')[];
  filters?: Record<string, any>;
  /** Overrides SAV (source de vérité depuis le tableau de gestion) */
  savOverrides?: Map<number, SAVOverrideEntry>;
}

/**
 * Récupère une métrique pour une agence spécifique
 * 
 * @param statId - Identifiant de la métrique
 * @param agencySlug - Slug de l'agence (ex: "dax", "toulouse")
 * @param params - Paramètres de calcul
 * @param services - Services de données Apogée
 * 
 * @example
 * ```typescript
 * const caGlobal = await getMetricForAgency(
 *   'ca_global_ht',
 *   'dax',
 *   { dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') } },
 *   apogeeServices
 * );
 * ```
 */
export async function getMetricForAgency(
  statId: string,
  agencySlug: string,
  params: AgencyMetricParams,
  services: ApogeeDataServices
): Promise<StatResult> {
  const fullParams: StatParams = {
    ...params,
    agencySlug,
  };
  
  return getMetric(statId, fullParams, services);
}

/**
 * Récupère plusieurs métriques pour une agence
 */
export async function getMetricsForAgency(
  statIds: string[],
  agencySlug: string,
  params: AgencyMetricParams,
  services: ApogeeDataServices
): Promise<Record<string, StatResult>> {
  const fullParams: StatParams = {
    ...params,
    agencySlug,
  };
  
  return getMetrics(statIds, fullParams, services);
}

/**
 * Récupère le dashboard complet d'une agence (métriques clés)
 */
export async function getAgencyDashboard(
  agencySlug: string,
  params: AgencyMetricParams,
  services: ApogeeDataServices
): Promise<{
  ca: { global: StatResult; parMois: StatResult; parUnivers: StatResult };
  devis: { tauxTransformation: StatResult; nombre: StatResult };
  sav: { taux: StatResult };
  recouvrement: { taux: StatResult; restant: StatResult };
}> {
  const fullParams: StatParams = {
    ...params,
    agencySlug,
  };
  
  const [
    caGlobal,
    caParMois,
    caParUnivers,
    tauxTransformation,
    nombreDevis,
    tauxSav,
    tauxRecouvrement,
    montantRestant,
  ] = await Promise.all([
    getMetric('ca_global_ht', fullParams, services),
    getMetric('ca_par_mois', fullParams, services),
    getMetric('ca_par_univers', fullParams, services),
    getMetric('taux_transformation_devis_nombre', fullParams, services),
    getMetric('nombre_devis', fullParams, services),
    getMetric('taux_sav_global', fullParams, services),
    getMetric('taux_recouvrement_global', fullParams, services),
    getMetric('montant_restant', fullParams, services),
  ]);
  
  return {
    ca: {
      global: caGlobal,
      parMois: caParMois,
      parUnivers: caParUnivers,
    },
    devis: {
      tauxTransformation,
      nombre: nombreDevis,
    },
    sav: {
      taux: tauxSav,
    },
    recouvrement: {
      taux: tauxRecouvrement,
      restant: montantRestant,
    },
  };
}
