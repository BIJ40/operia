/**
 * P3.2 - Utilitaires centralisés pour la conversion user_modules ↔ EnabledModules
 * 
 * Ce fichier est la source unique pour toutes les conversions entre:
 * - La table relationnelle `user_modules` (nouveau format normalisé)
 * - Le JSONB `profiles.enabled_modules` (format legacy)
 */

import type { EnabledModules, ModuleKey } from '@/types/modules';

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
 * @param rows - Lignes de la table user_modules
 * @returns Format EnabledModules pour usage frontend
 */
export function userModulesToEnabledModules(
  rows: UserModuleReadRow[] | null | undefined
): EnabledModules {
  if (!rows || rows.length === 0) return {};
  
  const result: EnabledModules = {};

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
  
  for (const row of rows) {
    const moduleKey = row.module_key as ModuleKey;

    const options = normalizeOptions(row.options);

    // 🧹 Cas legacy / incohérent : options présentes mais toutes à false → on considère le module désactivé
    // (évite le "coché mais grisé" sur des rôles qui n'ont de toute façon pas accès)
    if (options && Object.keys(options).length > 0 && !hasAnyTrue(options)) {
      continue;
    }

    if (options && Object.keys(options).length > 0) {
      result[moduleKey] = { enabled: true, options };
    } else {
      result[moduleKey] = { enabled: true };
    }
  }
  
  return result;
}

/**
 * Convertit EnabledModules en rows pour insertion dans user_modules
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
    
    const options = typeof value === 'object' && 'options' in value && value.options
      ? filterTrueOptions(value.options)
      : null;

    // Si quelqu'un a laissé un module "activé" mais toutes les options à false, on n'écrit rien.
    // (évite de recréer des rows legacy incohérentes)
    if (typeof value === 'object' && 'options' in value && value.options && options === null) {
      continue;
    }
    
    rows.push({
      user_id: userId,
      module_key: key,
      options,
      enabled_at: new Date().toISOString(),
      enabled_by: enabledBy || null,
    });
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
