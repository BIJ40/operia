/**
 * Performance Terrain — Règles métier centralisées
 * Source unique de vérité pour tous les seuils, pondérations et constantes
 */

import { STATIA_RULES } from '@/statia/domain/rules';
import type { DurationSource, PerformanceConfig, UnknownTechnicianPolicy } from './types';

// ============================================================================
// DURATION HIERARCHY — ordre de résolution des durées
// ============================================================================

/** Priority order: first match wins */
export const DURATION_HIERARCHY: DurationSource[] = [
  'explicit',        // durée fournie directement (duree, dureeMinutes, duration)
  'computed',        // calculée depuis start/end
  'planning',        // depuis créneau planning
  'business_default', // défaut métier configurable
  'unknown',         // aucune donnée — ne doit JAMAIS être injecté silencieusement
];

// ============================================================================
// CONFIDENCE WEIGHTS — pondération du score global
// ============================================================================

export const CONFIDENCE_WEIGHTS = {
  duration: 0.30,
  capacity: 0.25,
  matching: 0.25,
  classification: 0.20,
} as const;

// ============================================================================
// DEFAULT THRESHOLDS — seuils par défaut (overridable par config agence)
// ============================================================================

export const DEFAULT_THRESHOLDS: PerformanceConfig = {
  productivityOptimal: 0.65,
  productivityWarning: 0.50,
  loadMin: 0.80,
  loadMax: 1.10,
  savOptimal: 0.03,
  savWarning: 0.08,
  defaultWeeklyHours: 35,
  defaultTaskDurationMinutes: 60,
  deductPlanningUnavailability: false,
  holidays: [],
};

// ============================================================================
// INTERVENTION TYPES — from STATIA_RULES
// ============================================================================

export const PRODUCTIVE_TYPES: string[] = (
  STATIA_RULES.technicians?.productiveTypes as unknown as string[] || 
  ['depannage', 'repair', 'travaux', 'work']
).map(s => s.toLowerCase());

export const NON_PRODUCTIVE_TYPES: string[] = (
  STATIA_RULES.technicians?.nonProductiveTypes as unknown as string[] || 
  ['RT', 'rdv', 'rdvtech', 'sav', 'diagnostic']
).map(s => s.toLowerCase());

export const ALWAYS_PRODUCTIVE: string[] = [
  'recherche de fuite',
  'recherche fuite',
];

export const SAV_EXACT_TYPES = ['sav'];

// ============================================================================
// ABSENCE KEYWORDS — for planning_unavailability detection
// ============================================================================

export const ABSENCE_KEYWORDS = [
  'arret', 'arrêt', 'maladie', 'absence', 'conge', 'congé',
  'formation',
];

// ============================================================================
// MATCHING THRESHOLDS
// ============================================================================

export const MATCHING_THRESHOLDS = {
  mergeMinScore: 0.70,
  overlapMinRatio: 0.50,
} as const;

/** Scoring weights for work item similarity */
export const MATCHING_WEIGHTS = {
  sameInterventionId: 0.40,
  timeOverlap: 0.30,
  commonTechnicians: 0.20,
  sameProjectId: 0.10,
} as const;

// ============================================================================
// DURATION ABERRATION
// ============================================================================

export const MAX_DURATION_MINUTES = 720; // 12h — anything above is aberrant

// ============================================================================
// TECHNICIAN POLICY
// ============================================================================

export const UNKNOWN_TECHNICIAN_POLICY: UnknownTechnicianPolicy = 'team_only';

// ============================================================================
// EXCLUDED USER TYPES
// ============================================================================

export const EXCLUDED_USER_TYPES = [
  'commercial', 'admin', 'assistant', 'assistante',
  'administratif', 'direction', 'comptable',
];
