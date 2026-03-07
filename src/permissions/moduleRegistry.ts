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
  const [moduleKey, optionKey] = path.split('.') as [ModuleKey, string];
  
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
    if (validModuleKeys.has(key as ModuleKey)) {
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
 * Vérifie si un module est protégé
 */
export function isProtectedModule(moduleKey: ModuleKey): boolean {
  return PROTECTED_MODULES.includes(moduleKey);
}

/**
 * Vérifie l'accès au module apogee_tickets
 * Retourne true si l'utilisateur a accès à /projects/*
 */
export function hasProjectManagementAccess(
  enabledModules: Record<string, unknown> | null
): boolean {
  if (!enabledModules) return false;
  
  const moduleState = enabledModules['ticketing'];
  
  if (typeof moduleState === 'boolean') return moduleState;
  
  if (typeof moduleState === 'object' && moduleState !== null) {
    const state = moduleState as { enabled?: boolean };
    return state.enabled === true;
  }
  
  return false;
}

/**
 * Vérifie si l'option kanban est activée
 */
export function hasKanbanAccess(
  enabledModules: Record<string, unknown> | null
): boolean {
  if (!hasProjectManagementAccess(enabledModules)) return false;
  
  const moduleState = enabledModules?.['ticketing'];
  
  if (typeof moduleState === 'object' && moduleState !== null) {
    const state = moduleState as { options?: { kanban?: boolean } };
    if (!state.options) return true;
    return state.options.kanban !== false;
  }
  
  return typeof moduleState === 'boolean' && moduleState;
}

// ============================================================================
// COMPATIBILITÉ COMPAT MODE (COMMIT 5)
// ============================================================================

/**
 * Options avec fallback compat (routes qui acceptent option OU module root)
 */
export const COMPAT_MODE_OPTIONS: Record<string, ModuleKey> = {
  'agence.carte_rdv': 'agence',
  'agence.mes_apporteurs': 'agence',
  'agence.gestion_apporteurs': 'agence',
};

/**
 * Vérifie l'accès avec fallback compat
 * Si l'option n'existe pas explicitement, fallback sur le module racine
 */
export function hasAccessWithCompat(
  enabledModules: Record<string, unknown> | null,
  moduleKey: ModuleKey,
  optionKey?: string
): boolean {
  if (!enabledModules) return false;
  
  const moduleState = enabledModules[moduleKey];
  
  // Module non activé
  if (!moduleState) return false;
  
  // Module activé en booléen = toutes options actives
  if (typeof moduleState === 'boolean') return moduleState;
  
  // Module objet
  if (typeof moduleState === 'object' && moduleState !== null) {
    const state = moduleState as { enabled?: boolean; options?: Record<string, boolean> };
    if (!state.enabled) return false;
    
    // Pas d'option demandée = accès au module
    if (!optionKey) return true;
    
    // Option explicitement définie
    if (state.options && optionKey in state.options) {
      return state.options[optionKey] === true;
    }
    
    // COMPAT MODE: Si option non définie, fallback sur module root
    const compatPath = `${moduleKey}.${optionKey}`;
    if (compatPath in COMPAT_MODE_OPTIONS) {
      // L'option n'est pas explicitement configurée, on autorise si module activé
      return true;
    }
    
    return false;
  }
  
  return false;
}
