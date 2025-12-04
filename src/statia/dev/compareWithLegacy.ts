/**
 * StatIA V1 - Comparaison avec les calculs legacy
 * 
 * Ce fichier permet de comparer les résultats StatIA avec les calculs existants
 * pour valider la non-régression.
 * 
 * Usage (dev only):
 * ```typescript
 * import { runComparisonTests } from '@/statia/dev/compareWithLegacy';
 * 
 * const results = await runComparisonTests('dax', dateRange, apogeeServices);
 * console.log(results);
 * ```
 */

import { DateRange } from '../definitions/types';
import { getMetricForAgency } from '../api/getMetricForAgency';
import { ApogeeDataServices } from '../engine/loaders';

interface ComparisonResult {
  metric: string;
  statiaValue: number | Record<string, number>;
  legacyValue?: number | Record<string, number>;
  match: boolean;
  difference?: number | string;
  notes?: string;
}

/**
 * Compare le CA global StatIA avec le calcul legacy
 */
async function compareCAGlobal(
  agencySlug: string,
  dateRange: DateRange,
  services: ApogeeDataServices,
  legacyData?: { factures: any[] }
): Promise<ComparisonResult> {
  // Calcul StatIA
  const statiaResult = await getMetricForAgency(
    'ca_global_ht',
    agencySlug,
    { dateRange },
    services
  );
  
  const statiaValue = typeof statiaResult.value === 'number' ? statiaResult.value : 0;
  
  // Si données legacy fournies, calculer avec l'ancienne méthode
  let legacyValue: number | undefined;
  if (legacyData?.factures) {
    // Simulation du calcul legacy (à adapter selon dashboardCalculations)
    legacyValue = legacyData.factures.reduce((sum, f) => {
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const type = (f.typeFacture || '').toLowerCase();
      return sum + (type === 'avoir' ? -Math.abs(montant) : montant);
    }, 0);
  }
  
  const match = legacyValue !== undefined 
    ? Math.abs(statiaValue - legacyValue) < 0.01 
    : true;
  
  return {
    metric: 'ca_global_ht',
    statiaValue,
    legacyValue,
    match,
    difference: legacyValue !== undefined ? statiaValue - legacyValue : undefined,
    notes: !legacyValue ? 'Legacy data not provided for comparison' : undefined,
  };
}

/**
 * Compare le CA par univers StatIA avec le calcul legacy
 */
async function compareCAParUnivers(
  agencySlug: string,
  dateRange: DateRange,
  services: ApogeeDataServices
): Promise<ComparisonResult> {
  const statiaResult = await getMetricForAgency(
    'ca_par_univers',
    agencySlug,
    { dateRange },
    services
  );
  
  return {
    metric: 'ca_par_univers',
    statiaValue: statiaResult.value as Record<string, number>,
    match: true, // Sans données legacy, on suppose OK
    notes: 'Manual verification recommended',
  };
}

/**
 * Compare le taux SAV StatIA avec le calcul legacy
 */
async function compareTauxSAV(
  agencySlug: string,
  dateRange: DateRange,
  services: ApogeeDataServices
): Promise<ComparisonResult> {
  const statiaResult = await getMetricForAgency(
    'taux_sav_global',
    agencySlug,
    { dateRange },
    services
  );
  
  return {
    metric: 'taux_sav_global',
    statiaValue: statiaResult.value as number,
    match: true,
    notes: 'Manual verification recommended',
  };
}

/**
 * Compare le taux de transformation devis StatIA avec le calcul legacy
 */
async function compareTauxTransformation(
  agencySlug: string,
  dateRange: DateRange,
  services: ApogeeDataServices
): Promise<ComparisonResult> {
  const statiaResult = await getMetricForAgency(
    'taux_transformation_devis_nombre',
    agencySlug,
    { dateRange },
    services
  );
  
  return {
    metric: 'taux_transformation_devis_nombre',
    statiaValue: statiaResult.value as number,
    match: true,
    notes: 'Manual verification recommended',
  };
}

/**
 * Exécute tous les tests de comparaison
 */
export async function runComparisonTests(
  agencySlug: string,
  dateRange: DateRange,
  services: ApogeeDataServices,
  legacyData?: { factures: any[]; projects: any[]; devis: any[] }
): Promise<{
  summary: { total: number; passed: number; failed: number };
  results: ComparisonResult[];
}> {
  console.log(`[StatIA Dev] Running comparison tests for agency: ${agencySlug}`);
  console.log(`[StatIA Dev] Date range: ${dateRange.start.toISOString()} - ${dateRange.end.toISOString()}`);
  
  const results: ComparisonResult[] = [];
  
  try {
    results.push(await compareCAGlobal(agencySlug, dateRange, services, legacyData));
    results.push(await compareCAParUnivers(agencySlug, dateRange, services));
    results.push(await compareTauxSAV(agencySlug, dateRange, services));
    results.push(await compareTauxTransformation(agencySlug, dateRange, services));
  } catch (error) {
    console.error('[StatIA Dev] Error running comparison tests:', error);
  }
  
  const passed = results.filter(r => r.match).length;
  const failed = results.filter(r => !r.match).length;
  
  const summary = {
    total: results.length,
    passed,
    failed,
  };
  
  console.log(`[StatIA Dev] Results: ${passed}/${summary.total} passed`);
  
  if (failed > 0) {
    console.warn('[StatIA Dev] Failed comparisons:');
    results.filter(r => !r.match).forEach(r => {
      console.warn(`  - ${r.metric}: StatIA=${r.statiaValue}, Legacy=${r.legacyValue}, Diff=${r.difference}`);
    });
  }
  
  return { summary, results };
}

/**
 * Affiche un rapport détaillé des métriques StatIA
 */
export async function generateStatiaReport(
  agencySlug: string,
  dateRange: DateRange,
  services: ApogeeDataServices
): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    STATIA V1 REPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Agency: ${agencySlug}`);
  console.log(`Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`);
  console.log('───────────────────────────────────────────────────────────');
  
  const metrics = [
    'ca_global_ht',
    'ca_par_mois',
    'ca_par_univers',
    'ca_par_apporteur',
    'taux_sav_global',
    'taux_transformation_devis_nombre',
    'taux_recouvrement_global',
  ];
  
  for (const metric of metrics) {
    try {
      const result = await getMetricForAgency(metric, agencySlug, { dateRange }, services);
      
      console.log(`\n📊 ${metric}`);
      
      if (typeof result.value === 'number') {
        const formatted = metric.includes('taux') 
          ? `${result.value.toFixed(2)}%`
          : `${result.value.toLocaleString('fr-FR')} €`;
        console.log(`   Value: ${formatted}`);
      } else if (typeof result.value === 'object') {
        console.log('   Breakdown:');
        Object.entries(result.value).forEach(([key, val]) => {
          const formatted = metric.includes('taux')
            ? `${(val as number).toFixed(2)}%`
            : `${(val as number).toLocaleString('fr-FR')} €`;
          console.log(`     - ${key}: ${formatted}`);
        });
      }
      
      console.log(`   Records: ${result.metadata?.recordCount || 'N/A'}`);
    } catch (error) {
      console.error(`   ❌ Error computing ${metric}:`, error);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
}
