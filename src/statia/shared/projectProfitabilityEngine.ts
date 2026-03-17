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
  ProfitabilityIntervention,
  EmployeeCostProfile,
  ProjectCost,
  AgencyOverheadRule,
  ReliabilityLevel,
  ActionabilityLevel,
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

function sumAllCosts(costs: ProjectCost[], type: ProjectCost['cost_type']): number {
  return costs
    .filter(c => c.cost_type === type)
    .reduce((s, c) => s + (c.amount_ht ?? 0), 0);
}

function sumOtherCosts(costs: ProjectCost[], validatedOnly: boolean): number {
  return costs
    .filter(c => ['travel', 'rental', 'misc'].includes(c.cost_type) && (!validatedOnly || c.validation_status === 'validated'))
    .reduce((s, c) => s + (c.amount_ht ?? 0), 0);
}

// ─── Hash computation ────────────────────────────────────────

/**
 * Compute a deterministic hash of Apogée input data for staleness detection.
 * Uses a simple string hash (no crypto dependency needed in browser).
 */
function computeApogeeHash(
  factures: ProfitabilityFacture[],
  interventions: ProfitabilityIntervention[],
): string {
  const payload = JSON.stringify({
    factures: factures
      .map(f => ({ id: f.id, totalHT: f.totalHT, paidTTC: f.paidTTC, updatedAt: f.updatedAt ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    interventions: interventions
      .map(i => ({ id: i.id, hours: i.hours, technicianIds: [...i.technicianIds].sort(), updatedAt: i.updatedAt ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

// ─── Overhead calculation ────────────────────────────────────

function computeOverhead(
  rules: AgencyOverheadRule[],
  caInvoicedHT: number,
  hoursTotal: number,
  flags: string[],
): number {
  const validated = rules.filter(r => r.validation_status === 'validated');
  let total = 0;
  let hasNonProrated = false;
  for (const rule of validated) {
    switch (rule.allocation_mode) {
      case 'per_project':
      case 'fixed':
        total += rule.allocation_value;
        hasNonProrated = true;
        break;
      case 'percentage_ca':
        total += caInvoicedHT * (rule.allocation_value / 100);
        break;
      case 'per_hour':
        total += hoursTotal * rule.allocation_value;
        break;
    }
  }
  if (hasNonProrated) flags.push('overhead_not_prorated');
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

// ─── Actionability ───────────────────────────────────────────

function computeActionability(completenessScore: number): ActionabilityLevel {
  if (completenessScore >= 80) return 'exploitable';
  if (completenessScore >= 60) return 'partial';
  return 'not_exploitable';
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

  const profileMap = new Map<string, EmployeeCostProfile>();
  for (const cp of costProfiles) {
    if (cp.loaded_hourly_cost != null && cp.loaded_hourly_cost > 0) {
      if (cp.apogee_user_id != null) {
        profileMap.set(String(cp.apogee_user_id), cp);
      }
      profileMap.set(cp.collaborator_id, cp);
    }
  }

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

  // ── 4. Project costs (validated for margin, all for transparency) ──

  const costPurchases = sumValidatedCosts(projectCosts, 'purchase');
  const costSubcontracting = sumValidatedCosts(projectCosts, 'subcontract');
  const costOther = sumOtherCosts(projectCosts, true);

  const costPurchasesAll = sumAllCosts(projectCosts, 'purchase');
  const costSubcontractingAll = sumAllCosts(projectCosts, 'subcontract');
  const costOtherAll = sumOtherCosts(projectCosts, false);

  const hasCostsEntered = projectCosts.filter(c => c.validation_status === 'validated').length > 0;
  if (!hasCostsEntered) flags.push('no_project_costs_validated');

  // ── 5. Overhead ───────────────────────────────────────────

  const costOverhead = computeOverhead(overheadRules, caInvoicedHT, hoursTotal, flags);
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

  // Anomaly flags
  if (marginPct !== null && marginPct > 60) flags.push('margin_suspiciously_high');
  if (marginPct !== null && marginPct < -30) flags.push('margin_critical');
  if (hoursTotal > 0 && costLabor === 0) flags.push('labor_cost_zero');

  // ── 7. Reliability ────────────────────────────────────────

  const hasZeroInvoices = factures.some(f => f.totalHT === 0 && !isAvoir(f));

  const projectTechIds = new Set(
    interventions.flatMap(i => i.technicianIds),
  );
  const coveredCount = [...projectTechIds].filter(id => profileMap.has(id)).length;
  const coverageRate = projectTechIds.size > 0 ? coveredCount / projectTechIds.size : 0;

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

  // ── 8. Actionability & Hash ───────────────────────────────

  const actionabilityLevel = computeActionability(completenessScore);
  const apogeeDataHash = computeApogeeHash(factures, interventions);
  const computedAt = new Date().toISOString();

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
    costPurchasesAll,
    costSubcontractingAll,
    costOtherAll,
    grossMargin,
    netMargin,
    marginPct,
    hoursTotal,
    completenessScore,
    reliabilityLevel,
    actionabilityLevel,
    flags,
    laborDetail,
    apogeeDataHash,
    computedAt,
  };
}
