/**
 * Configuration centralisée des plans tarifaires
 * Source de vérité : table plan_tiers en base
 * Ce fichier sert de fallback et de typage TypeScript
 */

export const PLAN_LABELS = {
  FREE: 'Gratuit',
  STARTER: 'Basique',
  PRO: 'Pro',
  NONE: 'Individuel',
} as const;

export type PlanKey = keyof typeof PLAN_LABELS;

export const PLAN_COLORS = {
  FREE: 'bg-muted text-muted-foreground',
  STARTER: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0',
  PRO: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0',
} as const;

/**
 * Obtenir le label d'un plan (avec fallback)
 */
export function getPlanLabel(key: string): string {
  return PLAN_LABELS[key as PlanKey] || key;
}

/**
 * Obtenir la classe CSS d'un plan
 */
export function getPlanColorClass(key: string): string {
  return PLAN_COLORS[key as PlanKey] || 'bg-destructive/10 text-destructive';
}
