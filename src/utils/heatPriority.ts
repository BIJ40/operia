/**
 * Système de priorité heat unifié (0-12)
 * Utilisé partout: Support, Apogée, Notifications
 */

export const HEAT_PRIORITY_LEVELS = {
  FROZEN: 0,
  LOW: 3,
  MEDIUM: 6,
  HIGH: 9,
  CRITICAL: 12,
} as const;

export interface HeatPriorityConfig {
  value: number;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  slaHours: number;
}

/**
 * Configuration complète des niveaux de priorité heat
 * P2: Support dark mode avec classes Tailwind dark:
 */
export function getHeatPriorityConfig(heat: number): HeatPriorityConfig {
  if (heat >= 11) {
    return {
      value: heat,
      label: 'Critique',
      emoji: '🔴',
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/40',
      slaHours: 4,
    };
  }
  
  if (heat >= 8) {
    return {
      value: heat,
      label: 'Élevé',
      emoji: '🟠',
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-100 dark:bg-orange-900/40',
      slaHours: 8,
    };
  }
  
  if (heat >= 4) {
    return {
      value: heat,
      label: 'Moyen',
      emoji: '🟡',
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
      slaHours: 24,
    };
  }
  
  return {
    value: heat,
    label: 'Faible',
    emoji: '🟢',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    slaHours: 72,
  };
}

/**
 * Migration des anciennes valeurs text vers heat
 */
export function migrateTextPriorityToHeat(textPriority: string): number {
  const mapping: Record<string, number> = {
    'bloquant': 12,
    'blocage': 12,
    'urgent': 9,
    'important': 6,
    'normal': 3,
    'faible': 1,
  };
  
  return mapping[textPriority.toLowerCase()] || 6;
}

/**
 * Label court pour UI compacte
 */
export function getHeatPriorityLabel(heat: number): string {
  return getHeatPriorityConfig(heat).label;
}

/**
 * Emoji pour affichage rapide
 */
export function getHeatPriorityEmoji(heat: number): string {
  return getHeatPriorityConfig(heat).emoji;
}

/**
 * Calcul heures SLA selon heat
 */
export function calculateSlaHours(heat: number): number {
  return getHeatPriorityConfig(heat).slaHours;
}

/**
 * Liste complète pour selectors
 */
export const HEAT_PRIORITY_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: i,
  label: `${i} - ${getHeatPriorityLabel(i)}`,
  emoji: getHeatPriorityEmoji(i),
}));
