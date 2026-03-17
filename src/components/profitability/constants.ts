/**
 * Profitability module constants — labels, colors, flag descriptions.
 */
import type { ReliabilityLevel, ActionabilityLevel, ProjectCostType, OverheadCostType } from '@/types/projectProfitability';

// ─── Reliability ─────────────────────────────────────────────

export const RELIABILITY_COLORS: Record<ReliabilityLevel, string> = {
  insufficient: 'bg-destructive/10 text-destructive border-destructive/20',
  low: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  good: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  excellent: 'bg-green-100 text-green-700 border-green-200',
};

export const RELIABILITY_LABELS: Record<ReliabilityLevel, string> = {
  insufficient: 'Insuffisant',
  low: 'Faible',
  medium: 'Moyen',
  good: 'Bon',
  excellent: 'Excellent',
};

// ─── Actionability ───────────────────────────────────────────

export const ACTIONABILITY_COLORS: Record<ActionabilityLevel, string> = {
  not_exploitable: 'bg-destructive/10 text-destructive border-destructive/20',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  exploitable: 'bg-green-100 text-green-700 border-green-200',
};

export const ACTIONABILITY_LABELS: Record<ActionabilityLevel, string> = {
  not_exploitable: 'Non exploitable',
  partial: 'Partiellement exploitable',
  exploitable: 'Exploitable',
};

export const ACTIONABILITY_ICONS: Record<ActionabilityLevel, string> = {
  not_exploitable: '❌',
  partial: '⚠️',
  exploitable: '✅',
};

// ─── Flags ───────────────────────────────────────────────────

export const FLAG_LABELS: Record<string, string> = {
  no_invoices: 'Aucune facture trouvée',
  no_hours: 'Aucune heure enregistrée',
  labor_cost_estimated: 'Coût MO estimé (profil manquant)',
  missing_cost_profile: 'Aucun profil coût technicien',
  partial_cost_profile_coverage: 'Profils coût incomplets',
  no_project_costs_validated: 'Aucun coût dossier validé',
  overhead_not_configured: 'Charges agence non configurées',
  overhead_not_prorated: 'Charges non proratisées',
  negative_margin: 'Marge nette négative',
  high_overhead_ratio: 'Ratio charges/CA élevé (>30%)',
  margin_suspiciously_high: 'Marge suspecte (>60%)',
  margin_critical: 'Marge critique (<-30%)',
  labor_cost_zero: 'Coût MO nul malgré des heures',
  snapshot_outdated: 'Données modifiées depuis le calcul',
};

export const FLAG_SEVERITY: Record<string, 'info' | 'warning' | 'error'> = {
  no_invoices: 'warning',
  no_hours: 'warning',
  labor_cost_estimated: 'info',
  missing_cost_profile: 'warning',
  partial_cost_profile_coverage: 'info',
  no_project_costs_validated: 'info',
  overhead_not_configured: 'info',
  overhead_not_prorated: 'info',
  negative_margin: 'error',
  high_overhead_ratio: 'warning',
  margin_suspiciously_high: 'error',
  margin_critical: 'error',
  labor_cost_zero: 'error',
  snapshot_outdated: 'warning',
};

// ─── Cost types ──────────────────────────────────────────────

export const PROJECT_COST_TYPE_LABELS: Record<ProjectCostType, string> = {
  purchase: 'Achat',
  subcontract: 'Sous-traitance',
  travel: 'Déplacement',
  rental: 'Location',
  misc: 'Divers',
};

export const OVERHEAD_COST_TYPE_LABELS: Record<OverheadCostType, string> = {
  rent: 'Loyer',
  vehicle: 'Véhicule',
  fuel: 'Carburant',
  admin: 'Administratif',
  software: 'Logiciel',
  insurance: 'Assurance',
  other: 'Autre',
};

// ─── Priority actions (for reliability section) ──────────────

export const PRIORITY_ACTIONS: { flag: string; action: string; impact: number }[] = [
  { flag: 'missing_cost_profile', action: 'Compléter les profils coût des techniciens', impact: 25 },
  { flag: 'no_project_costs_validated', action: 'Valider les coûts saisis du dossier', impact: 10 },
  { flag: 'overhead_not_configured', action: 'Configurer les charges agence', impact: 10 },
  { flag: 'labor_cost_zero', action: 'Vérifier le coût MO (heures sans coût)', impact: 15 },
  { flag: 'partial_cost_profile_coverage', action: 'Compléter les profils manquants', impact: 10 },
  { flag: 'no_invoices', action: 'Vérifier la facturation du dossier', impact: 20 },
  { flag: 'no_hours', action: 'Vérifier les heures d\'intervention', impact: 15 },
];

// ─── Formatting helpers ──────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)} %`;
}

export function formatHours(value: number): string {
  return `${value.toFixed(1)} h`;
}
