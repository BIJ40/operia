/**
 * MODULE REGISTRY V2.0
 * 
 * Canon unique pour les modules et options.
 * Toutes les vérifications de validité passent par ce registry.
 * 
 * V2.0: Source de vérité alignée sur MODULE_DEFINITIONS de types/modules.ts
 */

import { 
  MODULE_DEFINITIONS, 
  ModuleKey, 
  ModuleDefinition, 
  ModuleOptionDefinition,
  MODULES 
} from '@/types/modules';

// ============================================================================
// REGISTRY API
// ============================================================================

/**
 * Retourne tous les modules définis
 */
export function getAllModules(): ModuleDefinition[] {
  return MODULE_DEFINITIONS;
}

/**
 * Retourne un module par sa clé
 */
export function getModule(moduleKey: ModuleKey): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find(m => m.key === moduleKey);
}

/**
 * Retourne les options d'un module
 */
export function getModuleOptions(moduleKey: ModuleKey): ModuleOptionDefinition[] {
  const module = getModule(moduleKey);
  return module?.options ?? [];
}

/**
 * Vérifie si un path d'option est valide (ex: "pilotage_agence.carte_rdv")
 */
export function isValidOptionPath(path: string): boolean {
  const lastDot = path.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const moduleKey = path.substring(0, lastDot);
  const optionKey = path.substring(lastDot + 1);
  if (!moduleKey || !optionKey) return false;
  if (!isValidModuleKey(moduleKey)) return false;
  
  const options = getModuleOptions(moduleKey);
  return options.some(opt => opt.key === optionKey);
}

/**
 * Vérifie si une clé de module est valide
 */
export function isValidModuleKey(key: string): key is ModuleKey {
  return key in MODULES;
}

/**
 * Retourne toutes les clés de modules valides
 */
export function getValidModuleKeys(): ModuleKey[] {
  return Object.keys(MODULES) as ModuleKey[];
}

/**
 * Retourne toutes les clés d'options valides pour un module
 */
export function getValidOptionKeys(moduleKey: ModuleKey): string[] {
  return getModuleOptions(moduleKey).map(opt => opt.key);
}

// ============================================================================
// VALIDATION DEV
// ============================================================================

interface ValidationIssue {
  type: 'error' | 'warning';
  source: string;
  message: string;
  key: string;
}

/**
 * Valide la cohérence des définitions.
 * À appeler en dev pour détecter les incohérences.
 */
export function validateModuleDefinitions(
  externalKeys: Record<string, unknown>,
  sourceName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validModuleKeys = new Set(getValidModuleKeys());
  
  for (const key of Object.keys(externalKeys)) {
    // Vérifier si c'est un module racine
    if (isValidModuleKey(key)) {
      continue; // Module valide
    }
    
    // Vérifier si c'est un path d'option (module.option)
    if (key.includes('.')) {
      if (!isValidOptionPath(key)) {
        issues.push({
          type: 'error',
          source: sourceName,
          message: `Option path "${key}" n'existe pas dans MODULE_DEFINITIONS`,
          key,
        });
      }
    } else {
      // Clé racine invalide
      issues.push({
        type: 'error',
        source: sourceName,
        message: `Module "${key}" n'existe pas dans MODULE_DEFINITIONS`,
        key,
      });
    }
  }
  
  return issues;
}

/**
 * Log les issues de validation en console (dev only)
 */
export function logValidationIssues(issues: ValidationIssue[]): void {
  if (issues.length === 0) return;
  
  console.group('🔴 Module Registry Validation Issues');
  for (const issue of issues) {
    const prefix = issue.type === 'error' ? '❌' : '⚠️';
    console.log(`${prefix} [${issue.source}] ${issue.message}`);
  }
  console.groupEnd();
}

// ============================================================================
// PROTECTION APOGEE_TICKETS (COMMIT 1)
// ============================================================================

/**
 * Module protégé - ne doit JAMAIS être supprimé ou renommé
 */
export const PROTECTED_MODULES: ModuleKey[] = ['ticketing'];

/**
 * Modules qui sont en réalité des interfaces de rôle, pas des modules administrables.
 * Ils restent dans MODULE_DEFINITIONS pour compatibilité technique mais ne doivent pas
 * apparaître dans l'admin des modules standard.
 */
export const ROLE_INTERFACE_MODULES: ModuleKey[] = MODULE_DEFINITIONS
  .filter(m => (m as any).roleInterface === true)
  .map(m => m.key);

/**
 * Modules activables UNIQUEMENT par overwrite utilisateur (user_modules).
 * Jamais activés par plan (plan_tier_modules) ni par rôle (DEFAULT_MODULES_BY_ROLE).
 */
export const OVERWRITE_ONLY_MODULES: ModuleKey[] = MODULE_DEFINITIONS
  .filter(m => m.overwriteOnly === true)
  .map(m => m.key);

/**
 * Vérifie si un module est overwrite-only (opt-in individuel uniquement)
 */
export function isOverwriteOnlyModule(moduleKey: ModuleKey): boolean {
  return OVERWRITE_ONLY_MODULES.includes(moduleKey);
}

/**
 * Vérifie si un module est protégé
 */
export function isProtectedModule(moduleKey: ModuleKey): boolean {
  return PROTECTED_MODULES.includes(moduleKey);
}

/**
 * Vérifie si un module est une interface de rôle (pas administrable)
 */
export function isRoleInterfaceModule(moduleKey: ModuleKey): boolean {
  return ROLE_INTERFACE_MODULES.includes(moduleKey);
}
