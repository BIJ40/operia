/**
 * DEV VALIDATOR
 * 
 * Validation des définitions de modules en développement.
 * Détecte les incohérences entre code et définitions.
 * 
 * @see COMMIT 2 du plan "5 commits zéro casse"
 */

import { MODULE_OPTION_MIN_ROLES, MODULE_LABELS } from './constants';
import { validateModuleDefinitions, logValidationIssues, getValidModuleKeys, getValidOptionKeys } from './moduleRegistry';
import { ModuleKey } from '@/types/modules';

// ============================================================================
// VALIDATION AUTOMATIQUE EN DEV
// ============================================================================

/**
 * Exécute toutes les validations et log les issues
 * À appeler au démarrage de l'app en dev
 */
export function runDevValidation(): void {
  if (import.meta.env.PROD) return; // Skip en production
  
  const allIssues: Array<{ type: 'error' | 'warning'; source: string; message: string; key: string }> = [];
  
  // 1. Valider MODULE_DEFINITIONS minRoles (dérivé automatiquement, validation légère)
  // MODULE_MIN_ROLES est maintenant dérivé de MODULE_DEFINITIONS, pas besoin de valider la cohérence
  
  // 2. Valider MODULE_LABELS  
  const labelsIssues = validateModuleDefinitions(
    MODULE_LABELS as Record<string, unknown>,
    'MODULE_LABELS'
  );
  allIssues.push(...labelsIssues);
  
  // 3. Valider MODULE_OPTION_MIN_ROLES (paths uniquement)
  const optionMinRolesIssues = validateModuleOptionMinRoles();
  allIssues.push(...optionMinRolesIssues);
  
  // 4. Vérifier que tous les modules du canon ont des labels
  const missingLabelsIssues = validateModuleLabelsCompleteness();
  allIssues.push(...missingLabelsIssues);
  
  // Log si issues
  if (allIssues.length > 0) {
    logValidationIssues(allIssues);
  } else {
    console.log('✅ Module Registry: All definitions are consistent');
  }
}

/**
 * Valide que MODULE_OPTION_MIN_ROLES ne contient que des paths valides
 */
function validateModuleOptionMinRoles(): Array<{ type: 'error' | 'warning'; source: string; message: string; key: string }> {
  const issues: Array<{ type: 'error' | 'warning'; source: string; message: string; key: string }> = [];
  const validModuleKeys = new Set(getValidModuleKeys());
  
  for (const key of Object.keys(MODULE_OPTION_MIN_ROLES)) {
    // Support multi-dot keys: "moduleKey.optionKey" where moduleKey can contain dots
    // e.g. "rh.rh_viewer" or "pilotage.agence.indicateurs"
    const lastDot = key.lastIndexOf('.');
    if (lastDot <= 0) {
      issues.push({
        type: 'error',
        source: 'MODULE_OPTION_MIN_ROLES',
        message: `Invalid format "${key}" - expected "moduleKey.optionKey"`,
        key,
      });
      continue;
    }
    
    const moduleKey = key.substring(0, lastDot);
    const optionKey = key.substring(lastDot + 1);
    
    if (!validModuleKeys.has(moduleKey as ModuleKey)) {
      issues.push({
        type: 'error',
        source: 'MODULE_OPTION_MIN_ROLES',
        message: `Module "${moduleKey}" in "${key}" doesn't exist in MODULE_DEFINITIONS`,
        key,
      });
      continue;
    }
    
    const validOptions = getValidOptionKeys(moduleKey as ModuleKey);
    if (!validOptions.includes(optionKey)) {
      issues.push({
        type: 'warning',
        source: 'MODULE_OPTION_MIN_ROLES',
        message: `Option "${optionKey}" in "${key}" doesn't exist in ${moduleKey}.options`,
        key,
      });
    }
  }
  
  return issues;
}

/**
 * Valide que tous les modules ont un label
 */
function validateModuleLabelsCompleteness(): Array<{ type: 'error' | 'warning'; source: string; message: string; key: string }> {
  const issues: Array<{ type: 'error' | 'warning'; source: string; message: string; key: string }> = [];
  const validModuleKeys = getValidModuleKeys();
  
  for (const moduleKey of validModuleKeys) {
    if (!(moduleKey in MODULE_LABELS)) {
      issues.push({
        type: 'warning',
        source: 'MODULE_LABELS',
        message: `Module "${moduleKey}" has no label defined`,
        key: moduleKey,
      });
    }
  }
  
  return issues;
}

// ============================================================================
// DEPRECATED MARKER
// ============================================================================

/**
 * Marque PERMISSION_DEFINITIONS comme deprecated
 * Utilisé par UserModulesTab.tsx en attendant la génération depuis MODULE_DEFINITIONS
 */
export function markAsDeprecated(constantName: string, replacement: string): void {
  if (import.meta.env.PROD) return;
  
  console.warn(
    `⚠️ DEPRECATED: ${constantName} is deprecated. Use ${replacement} instead.`
  );
}
