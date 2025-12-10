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
  
  for (const row of rows) {
    const moduleKey = row.module_key as ModuleKey;
    const options = row.options as Record<string, boolean> | null;
    
    if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      result[moduleKey] = {
        enabled: true,
        options,
      };
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
  
  for (const [key, value] of Object.entries(enabledModules)) {
    if (!value) continue;
    
    const isEnabled = typeof value === 'boolean' ? value : value.enabled;
    if (!isEnabled) continue;
    
    const options = typeof value === 'object' && 'options' in value && value.options
      ? value.options
      : null;
    
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
