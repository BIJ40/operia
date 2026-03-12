/**
 * P3.2 - Utilitaires centralisés pour la conversion user_modules ↔ EnabledModules
 * 
 * Ce fichier est la source unique pour toutes les conversions entre:
 * - La table relationnelle `user_modules` (nouveau format normalisé)
 * - Le JSONB `profiles.enabled_modules` (format legacy)
 * 
 * PHASE 9 — DUAL-KEY MAPPING (TRANSITOIRE)
 * 
 * Contexte:
 *   La table `user_modules` stocke des clés legacy (aide, rh, agence…)
 *   MODULE_DEFINITIONS utilise des clés hiérarchiques (support.aide_en_ligne, organisation.salaries…)
 * 
 * Stratégie:
 *   READ  → `userModulesToEnabledModules` peuple DEUX clés (legacy + hiérarchique)
 *           pour que MODULE_DEFINITIONS-based lookups résolvent correctement
 *   WRITE → `enabledModulesToRows` normalise vers la clé legacy avant écriture
 *           pour maintenir la compatibilité DB
 * 
 * Suppression prévue:
 *   Quand la DB sera migrée vers les clés hiérarchiques ET la RPC mise à jour,
 *   supprimer les maps LEGACY_TO_HIERARCHICAL / HIERARCHICAL_TO_LEGACY
 *   et ne garder que le passage direct.
 * 
 * Anti-doublons visuels:
 *   Les composants admin (InlineModuleBadges, UserAccessSimple, UserProfileSheet)
 *   itèrent MODULE_DEFINITIONS qui n'utilise QUE des clés hiérarchiques.
 *   Les clés legacy présentes dans enabledModules ne sont jamais rendues directement
 *   car aucun MODULE_DEFINITIONS[].key n'est une clé legacy.
 *   → Aucun doublon visuel, aucun double comptage.
 */

import type { EnabledModules, ModuleKey } from '@/types/modules';

// ============================================================================
// Phase 9 — Mapping bidirectionnel legacy ↔ hiérarchique (TRANSITOIRE)
// ============================================================================

/**
 * Map legacy DB keys → hierarchical MODULE_DEFINITIONS keys.
 * Used in READ path to populate both key forms.
 */
const LEGACY_TO_HIERARCHICAL: Record<string, string> = {
  agence: 'pilotage.agence',
  stats: 'pilotage.statistiques',
  rh: 'organisation.salaries',
  parc: 'organisation.parc',
  divers_apporteurs: 'organisation.apporteurs',
  divers_plannings: 'organisation.plannings',
  divers_reunions: 'organisation.reunions',
  divers_documents: 'mediatheque.documents',
  guides: 'support.guides',
  aide: 'support.aide_en_ligne',
  realisations: 'commercial.realisations',
};

/**
 * Reverse map: hierarchical keys → legacy DB keys.
 * Used in WRITE path to normalize before DB insertion.
 */
const HIERARCHICAL_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_HIERARCHICAL).map(([legacy, hierarchical]) => [hierarchical, legacy])
);

// Type pour une ligne de user_modules
export interface UserModuleRow {
  id?: string;
  user_id: string;
  module_key: string;
  options: Record<string, boolean> | null;
  enabled_at?: string;
  enabled_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Type minimal pour la lecture (sans les champs metadata)
export interface UserModuleReadRow {
  module_key: string;
  options: unknown;
}

/**
 * Convertit les rows user_modules en format EnabledModules (JSONB compatible)
 * 
 * PHASE 9: Produit DEUX entrées par module legacy:
 *   - result['aide'] = { enabled: true, options: {...} }       ← clé legacy (compat RPC/code existant)
 *   - result['support.aide_en_ligne'] = { enabled: true, ... } ← clé hiérarchique (MODULE_DEFINITIONS lookups)
 * 
 * Déduplication: si une row hiérarchique existe DÉJÀ en DB, elle prend priorité.
 * 
 * @param rows - Lignes de la table user_modules
 * @returns Format EnabledModules pour usage frontend
 */
export function userModulesToEnabledModules(
  rows: UserModuleReadRow[] | null | undefined
): EnabledModules {
  if (!rows || rows.length === 0) return {};
  
  const result: EnabledModules = {};

  // Track which hierarchical keys are explicitly present in DB rows
  const explicitHierarchicalKeys = new Set<string>();

  const normalizeOptions = (raw: unknown): Record<string, boolean> | null => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const boolEntries = Object.entries(obj).filter(([, v]) => typeof v === 'boolean') as Array<
      [string, boolean]
    >;
    if (boolEntries.length === 0) return null;
    return Object.fromEntries(boolEntries);
  };

  const hasAnyTrue = (opts: Record<string, boolean>): boolean => {
    return Object.values(opts).some(v => v === true);
  };

  const buildModuleValue = (options: Record<string, boolean> | null) => {
    if (options && Object.keys(options).length > 0) {
      return { enabled: true, options };
    }
    return { enabled: true };
  };

  // First pass: identify explicit hierarchical keys in DB
  for (const row of rows) {
    if (row.module_key in HIERARCHICAL_TO_LEGACY) {
      explicitHierarchicalKeys.add(row.module_key);
    }
  }
  
  for (const row of rows) {
    const moduleKey = row.module_key;
    const options = normalizeOptions(row.options);

    // Skip modules where all options are false (legacy inconsistency)
    if (options && Object.keys(options).length > 0 && !hasAnyTrue(options)) {
      continue;
    }

    const value = buildModuleValue(options);

    // Set the primary key (as stored in DB)
    result[moduleKey] = value;

    // Phase 9 dual-key: also set the counterpart
    const hierarchicalKey = LEGACY_TO_HIERARCHICAL[row.module_key];
    if (hierarchicalKey) {
      // Legacy key in DB → also set hierarchical, unless DB already has explicit hierarchical row
      if (!explicitHierarchicalKeys.has(hierarchicalKey)) {
        result[hierarchicalKey] = value;
      }
    }
    // If this IS a hierarchical key, also set the legacy counterpart
    const legacyKey = HIERARCHICAL_TO_LEGACY[row.module_key];
    if (legacyKey) {
      // Hierarchical key in DB → also set legacy (hierarchical takes precedence)
      result[legacyKey] = value;
    }
  }
  
  return result;
}

/**
 * Convertit EnabledModules en rows pour insertion dans user_modules
 * 
 * PHASE 9: Normalise les clés hiérarchiques vers legacy avant écriture.
 * Si la clé est 'pilotage.agence', elle est écrite comme 'agence' en DB.
 * Empêche les doublons : si both 'agence' et 'pilotage.agence' sont dans
 * enabledModules, seule la clé legacy est écrite une fois.
 * 
 * @param userId - ID de l'utilisateur
 * @param enabledModules - Modules au format JSONB
 * @param enabledBy - ID de l'utilisateur qui active (optionnel)
 * @returns Array de rows prêtes pour insertion
 */
export function enabledModulesToRows(
  userId: string,
  enabledModules: EnabledModules | null | undefined,
  enabledBy?: string | null
): Omit<UserModuleRow, 'id' | 'created_at' | 'updated_at'>[] {
  if (!enabledModules) return [];
  
  const rows: Omit<UserModuleRow, 'id' | 'created_at' | 'updated_at'>[] = [];
  // Track written keys (normalized to legacy) to avoid duplicates
  const writtenKeys = new Set<string>();

  const filterTrueOptions = (opts: unknown): Record<string, boolean> | null => {
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return null;
    const obj = opts as Record<string, unknown>;
    const trues = Object.entries(obj)
      .filter(([, v]) => v === true)
      .map(([k]) => [k, true] as const);
    if (trues.length === 0) return null;
    return Object.fromEntries(trues);
  };
  
  for (const [key, value] of Object.entries(enabledModules)) {
    if (!value) continue;
    
    const isEnabled = typeof value === 'boolean' ? value : value.enabled;
    if (!isEnabled) continue;

    // Phase 9: Normalize hierarchical → legacy for DB write
    const dbKey = HIERARCHICAL_TO_LEGACY[key] || key;

    // Skip if we already wrote this normalized key
    if (writtenKeys.has(dbKey)) continue;
    
    const rawOptions = typeof value === 'object' && 'options' in value && value.options
      ? value.options
      : null;
    
    // Filtrer pour ne garder que les options à true
    const options = rawOptions ? filterTrueOptions(rawOptions) : null;

    // If all defined options are false, skip the module
    const hasDefinedOptions = rawOptions && Object.keys(rawOptions).length > 0;
    if (hasDefinedOptions && options === null) {
      continue;
    }
    
    rows.push({
      user_id: userId,
      module_key: dbKey,
      options,
      enabled_at: new Date().toISOString(),
      enabled_by: enabledBy || null,
    });
    writtenKeys.add(dbKey);
  }
  
  return rows;
}

/**
 * Vérifie si un module spécifique est activé dans EnabledModules
 */
export function isModuleEnabledInModules(
  modules: EnabledModules | null | undefined,
  moduleKey: ModuleKey
): boolean {
  if (!modules) return false;
  const value = modules[moduleKey];
  if (!value) return false;
  return typeof value === 'boolean' ? value : value.enabled === true;
}

/**
 * Vérifie si une option de module est activée
 */
export function isModuleOptionEnabledInModules(
  modules: EnabledModules | null | undefined,
  moduleKey: ModuleKey,
  optionKey: string
): boolean {
  if (!modules) return false;
  const value = modules[moduleKey];
  if (!value || typeof value === 'boolean') return false;
  return value.enabled && value.options?.[optionKey] === true;
}
