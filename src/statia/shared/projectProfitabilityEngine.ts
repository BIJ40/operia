/**
 * projectProfitabilityEngine.ts
 *
 * Moteur de calcul de la rentabilité réelle par dossier.
 * UNIQUEMENT basé sur des données réelles (factures, heures, coûts).
 * Aucun calcul basé sur devis.
 */

import type {
  ProfitabilityInputs,
  ProfitabilityResult,
  ProfitabilityFacture,
  EmployeeCostProfile,
  ProjectCost,
  AgencyOverheadRule,
  ReliabilityLevel,
} from '@/types/projectProfitability';

// ─── Helpers ─────────────────────────────────────────────────

const AVOIR_TYPES = new Set(['avoir', 'credit_note', 'Avoir']);

function isAvoir(f: ProfitabilityFacture): boolean {
  return AVOIR_TYPES.has(f.typeFacture ?? '');
}

function sumValidatedCosts(costs: ProjectCost[], type: ProjectCost['cost_type']): number {
  return costs
    .filter(c => c.cost_type === type && c.validation_status === 'validated')
    .reduce((s, c) => s + (c.amount_ht ?? 0), 0);
}

function sumOtherCosts(costs: ProjectCost[]): number {
  return costs
    .filter(c => ['travel', 'rental', 'misc'].includes(c.cost_type) && c.validation_status === 'validated')
    .reduce((s, c) => s + (c.amount_ht ?? 0), 0);
}

// ─── Overhead calculation ────────────────────────────────────

function computeOverhead(
  rules: AgencyOverheadRule[],
  caInvoicedHT: number,
  hoursTotal: number,
): number {
  const validated = rules.filter(r => r.validation_status === 'validated');
  let total = 0;
  for (const rule of validated) {
    switch (rule.allocation_mode) {
      case 'per_project':
      case 'fixed':
        total += rule.allocation_value;
        break;
      case 'percentage_ca':
        total += caInvoicedHT * (rule.allocation_value / 100);
        break;
      case 'per_hour':
        total += hoursTotal * rule.allocation_value;
        break;
    }
  }
  return total;
}

// ─── Reliability scoring ─────────────────────────────────────

interface ReliabilityCheck {
  label: string;
  weight: number;
  pass: boolean;
}

function computeReliability(
  checks: ReliabilityCheck[],
): { score: number; level: ReliabilityLevel } {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.pass).reduce((s, c) => s + c.weight, 0);
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;

  let level: ReliabilityLevel = 'insufficient';
  if (score >= 80) level = 'excellent';
  else if (score >= 60) level = 'good';
  else if (score >= 40) level = 'medium';
  else if (score >= 20) level = 'low';

  return { score, level };
}

// ─── Main engine ─────────────────────────────────────────────

export function computeProjectProfitability(
  inputs: ProfitabilityInputs,
): ProfitabilityResult {
  const {
    projectId,
    factures,
    interventions,
    costProfiles,
    projectCosts,
    overheadRules,
    isProjectClosed,
  } = inputs;

  const flags: string[] = [];

  // ── 1. CA (actuals only) ──────────────────────────────────

  const facturesNormales = factures.filter(f => !isAvoir(f));
  const avoirs = factures.filter(f => isAvoir(f));

  const caInvoicedHT =
    facturesNormales.reduce((s, f) => s + (f.totalHT ?? 0), 0) -
    avoirs.reduce((s, f) => s + Math.abs(f.totalHT ?? 0), 0);

  const caCollectedTTC = factures.reduce((s, f) => s + (f.paidTTC ?? 0), 0);

  if (factures.length === 0) flags.push('no_invoices');

  // ── 2. Hours ──────────────────────────────────────────────

  /**
   * HYPOTHÈSE V1 : les heures d'une intervention représentent la durée
   * totale du créneau commun. Si N techniciens sont affectés, chacun
   * est considéré comme ayant travaillé hours/N.
   *
   * Cette hypothèse peut sous-estimer le coût MO dans les cas où
   * la durée représente le temps individuel (chaque tech fait X heures).
   * À affiner en Phase 2 avec des données de créneau par technicien.
   */
  const hoursByTech = new Map<string, number>();
  for (const itv of interventions) {
    const techCount = itv.technicianIds.length || 1;
    const hoursPerTech = itv.hours / techCount;
    for (const tid of itv.technicianIds) {
      hoursByTech.set(tid, (hoursByTech.get(tid) ?? 0) + hoursPerTech);
    }
    if (itv.technicianIds.length === 0) {
      hoursByTech.set('__unknown__', (hoursByTech.get('__unknown__') ?? 0) + itv.hours);
    }
  }

  const hoursTotal = Array.from(hoursByTech.values()).reduce((s, h) => s + h, 0);
  if (hoursTotal === 0) flags.push('no_hours');

  // ── 3. Labor cost ─────────────────────────────────────────

  // Build cost profile lookup by apogee_user_id (string) for matching with intervention technicianIds
  const profileMap = new Map<string, EmployeeCostProfile>();
  for (const cp of costProfiles) {
    if (cp.loaded_hourly_cost != null && cp.loaded_hourly_cost > 0) {
      // Primary key: apogee_user_id (matches intervention technicianIds)
      if (cp.apogee_user_id != null) {
        profileMap.set(String(cp.apogee_user_id), cp);
      }
      // Secondary key: collaborator_id (fallback for internal lookups)
      profileMap.set(cp.collaborator_id, cp);
    }
  }

  // Compute average hourly cost for fallback
  // Deduplicate by collaborator_id to avoid counting the same profile twice
  const uniqueProfiles = new Map<string, EmployeeCostProfile>();
  for (const cp of costProfiles) {
    if (cp.loaded_hourly_cost != null && cp.loaded_hourly_cost > 0) {
      uniqueProfiles.set(cp.collaborator_id, cp);
    }
  }
  const profileValues = Array.from(uniqueProfiles.values());
  const avgHourlyCost =
    profileValues.length > 0
      ? profileValues.reduce((s, p) => s + (p.loaded_hourly_cost ?? 0), 0) / profileValues.length
      : 0;

  let hasEstimatedLabor = false;
  const laborDetail: ProfitabilityResult['laborDetail'] = [];
  let costLabor = 0;

  for (const [techId, hours] of hoursByTech) {
    const profile = profileMap.get(techId);
    const isEstimated = !profile;
    const rate = profile?.loaded_hourly_cost ?? avgHourlyCost;
    const cost = hours * rate;

    if (isEstimated) hasEstimatedLabor = true;

    laborDetail.push({
      technicianId: techId,
      hours,
      hourlyRate: rate,
      cost,
      isEstimated,
    });

    costLabor += cost;
  }

  if (hasEstimatedLabor) flags.push('labor_cost_estimated');
  // missing_cost_profile is now set after coverageRate is computed (section 7)

  // ── 4. Project costs ──────────────────────────────────────

  const costPurchases = sumValidatedCosts(projectCosts, 'purchase');
  const costSubcontracting = sumValidatedCosts(projectCosts, 'subcontract');
  const costOther = sumOtherCosts(projectCosts);

  const hasCostsEntered = projectCosts.filter(c => c.validation_status === 'validated').length > 0;
  if (!hasCostsEntered) flags.push('no_project_costs_validated');

  // ── 5. Overhead ───────────────────────────────────────────

  const costOverhead = computeOverhead(overheadRules, caInvoicedHT, hoursTotal);
  if (overheadRules.filter(r => r.validation_status === 'validated').length === 0) {
    flags.push('overhead_not_configured');
  }

  // ── 6. Totals & margins ───────────────────────────────────

  const directCosts = costLabor + costPurchases + costSubcontracting + costOther;
  const costTotal = directCosts + costOverhead;

  const grossMargin = caInvoicedHT - directCosts;
  const netMargin = grossMargin - costOverhead;
  const marginPct = caInvoicedHT > 0 ? (netMargin / caInvoicedHT) * 100 : null;

  if (netMargin < 0 && caInvoicedHT > 0) flags.push('negative_margin');
  if (costOverhead > 0 && caInvoicedHT > 0 && costOverhead / caInvoicedHT > 0.3) {
    flags.push('high_overhead_ratio');
  }

  // ── 7. Reliability ────────────────────────────────────────

  const hasZeroInvoices = factures.some(f => f.totalHT === 0 && !isAvoir(f));

  // Cost profile coverage: % of project technicians with a valid cost profile
  const projectTechIds = new Set(
    interventions.flatMap(i => i.technicianIds),
  );
  const coveredCount = [...projectTechIds].filter(id => profileMap.has(id)).length;
  const coverageRate = projectTechIds.size > 0 ? coveredCount / projectTechIds.size : 0;

  // Flags based on coverage
  if (projectTechIds.size > 0 && coverageRate === 0) {
    flags.push('missing_cost_profile');
  } else if (coverageRate > 0 && coverageRate < 1) {
    flags.push('partial_cost_profile_coverage');
  }

  const checks: ReliabilityCheck[] = [
    { label: 'invoices_present', weight: 20, pass: factures.length > 0 },
    { label: 'hours_present', weight: 15, pass: hoursTotal > 0 },
    { label: 'cost_profile_coverage', weight: 25, pass: coverageRate >= 0.8 },
    { label: 'costs_entered', weight: 10, pass: hasCostsEntered },
    { label: 'overhead_configured', weight: 10, pass: overheadRules.filter(r => r.validation_status === 'validated').length > 0 },
    { label: 'labor_not_estimated', weight: 10, pass: !hasEstimatedLabor },
    { label: 'invoices_coherent', weight: 5, pass: !hasZeroInvoices },
    { label: 'project_closed_or_invoiced', weight: 5, pass: isProjectClosed || caInvoicedHT > 0 },
  ];

  const { score: completenessScore, level: reliabilityLevel } = computeReliability(checks);

  // ── Result ────────────────────────────────────────────────

  return {
    projectId,
    caInvoicedHT,
    caCollectedTTC,
    costLabor,
    costPurchases,
    costSubcontracting,
    costOther,
    costOverhead,
    costTotal,
    grossMargin,
    netMargin,
    marginPct,
    hoursTotal,
    completenessScore,
    reliabilityLevel,
    flags,
    laborDetail,
  };
}
