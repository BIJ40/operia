/**
 * PERMISSIONS ENGINE V2.0
 * 
 * Source de vérité UNIQUE pour tout le système de permissions.
 * Tout le reste (guards, menus, edge functions) consomme ce moteur.
 * 
 * V2.0: Basé exclusivement sur global_role (N0-N6) + enabled_modules JSONB.
 *       Les références V1 (isAdmin, roles legacy) sont obsolètes.
 * 
 * @see docs/MODULES_DOCUMENTATION.md pour la documentation complète
 */

import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { 
  ModuleKey, 
  EnabledModules, 
  MODULE_DEFINITIONS,
} from '@/types/modules';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import {
  PermissionContext,
  HasAccessParams,
  PermissionIssue,
  AccessTrace,
  EffectiveModule,
  UserManagementCapabilities,
} from './types';
import {
  BYPASS_ROLES,
  BYPASS_MIN_LEVEL,
  AGENCY_REQUIRED_MODULES,
  AGENCY_ROLES,
  NETWORK_MODULES,
  NETWORK_MIN_ROLE,
  ROLE_HIERARCHY,
  MODULE_MIN_ROLES,
  MODULE_OPTION_MIN_ROLES,
} from './constants';

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Vérifie si un utilisateur a un rôle minimum
 */
export function hasMinRole(role: GlobalRole | null, minRole: GlobalRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Obtient le niveau numérique d'un rôle
 */
export function getRoleLevel(role: GlobalRole | null): number {
  if (!role) return 0;
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Vérifie si un rôle est un bypass (N5+)
 */
export function isBypassRole(role: GlobalRole | null): boolean {
  if (!role) return false;
  return BYPASS_ROLES.includes(role);
}

/**
 * FONCTION CENTRALE: Vérifie l'accès à un module/option
 * 
 * Ordre de précédence:
 * 1. N6 superadmin → accès absolu
 * 2. N5 platform_admin → bypass tous les modules
 * 3. Module nécessite agence + pas d'agence → refus
 * 4. Rôle minimum du module non atteint → refus
 * 5. Module explicitement activé → accès
 * 6. Module implicitement activé (défaut du rôle) → accès
 * 7. Option spécifique demandée → vérification
 */
export function hasAccess(params: HasAccessParams): boolean {
  const { globalRole, enabledModules, agencyId, moduleId, optionId } = params;
  
  // 1. Bypass N5+ (superadmin ou platform_admin)
  if (globalRole && isBypassRole(globalRole)) {
    return true;
  }
  
  // 2. Vérifier rôle minimum du module
  const minRole = MODULE_MIN_ROLES[moduleId];
  if (minRole && globalRole && !hasMinRole(globalRole, minRole)) {
    return false;
  }
  
  // 3. Vérifier si module nécessite agence
  if (AGENCY_REQUIRED_MODULES.includes(moduleId) && !agencyId) {
    return false;
  }
  
  // 4. Vérifier modules réseau (N3+ seulement)
  if (NETWORK_MODULES.includes(moduleId) && !hasMinRole(globalRole, NETWORK_MIN_ROLE)) {
    return false;
  }
  
  // 5. Obtenir les modules effectifs (explicites ou par défaut)
  const effectiveModules = getEffectiveModules({ globalRole, enabledModules, agencyId });
  const moduleAccess = effectiveModules.find(m => m.id === moduleId);
  
  if (!moduleAccess?.enabled) {
    return false;
  }
  
  // 6. Vérifier option spécifique si demandée
  if (optionId) {
    // Vérifier le rôle minimum de l'option
    const optionMinRoleKey = `${moduleId}.${optionId}`;
    const optionMinRole = MODULE_OPTION_MIN_ROLES[optionMinRoleKey];
    if (optionMinRole && !hasMinRole(globalRole, optionMinRole)) {
      return false;
    }
    
    // Vérifier si l'option est activée
    if (moduleAccess.options) {
      return moduleAccess.options[optionId] === true;
    }
    return false;
  }
  
  return true;
}

/**
 * Obtient la liste des modules effectifs pour un utilisateur
 * Combine modules explicites + modules par défaut du rôle
 */
export function getEffectiveModules(ctx: PermissionContext): EffectiveModule[] {
  const { globalRole, enabledModules, agencyId } = ctx;
  const result: EffectiveModule[] = [];
  
  // Si N5+, tous les modules sont accessibles
  if (globalRole && isBypassRole(globalRole)) {
    for (const moduleDef of MODULE_DEFINITIONS) {
      result.push({
        id: moduleDef.key,
        enabled: true,
        source: 'bypass',
        options: Object.fromEntries(
          moduleDef.options.map(opt => [opt.key, true])
        ),
      });
    }
    return result;
  }
  
  // Obtenir les modules par défaut du rôle
  const defaultModules = globalRole 
    ? DEFAULT_MODULES_BY_ROLE[globalRole] || {}
    : {};
  
  // Fusionner explicites + défauts
  for (const moduleDef of MODULE_DEFINITIONS) {
    const moduleKey = moduleDef.key;
    
    // Vérifier si le module nécessite une agence
    if (AGENCY_REQUIRED_MODULES.includes(moduleKey) && !agencyId) {
      result.push({
        id: moduleKey,
        enabled: false,
        source: 'explicit',
        options: {},
      });
      continue;
    }
    
    // Vérifier rôle minimum
    const modMinRole = moduleDef.minRole;
    if (globalRole && modMinRole && !hasMinRole(globalRole, modMinRole)) {
      result.push({
        id: moduleKey,
        enabled: false,
        source: 'explicit',
        options: {},
      });
      continue;
    }
    
    // Priorité: explicite > défaut
    const explicitModule = enabledModules?.[moduleKey];
    const defaultModule = defaultModules[moduleKey];
    
    if (explicitModule !== undefined) {
      // Module explicitement configuré
      const isEnabled = typeof explicitModule === 'boolean' 
        ? explicitModule 
        : explicitModule?.enabled ?? false;
      
      // IMPORTANT: Fusionner les options explicites avec les valeurs par défaut de MODULE_DEFINITIONS
      // Cela garantit que si options est vide {}, on utilise les defaultEnabled
      const explicitOptions = typeof explicitModule === 'object' && explicitModule?.options
        ? explicitModule.options
        : {};
      
      const mergedOptions: Record<string, boolean> = {};
      for (const optDef of moduleDef.options) {
        // Priorité: option explicite > defaultEnabled de la définition
        if (explicitOptions[optDef.key] !== undefined) {
          mergedOptions[optDef.key] = explicitOptions[optDef.key];
        } else {
          mergedOptions[optDef.key] = optDef.defaultEnabled;
        }
      }
        
      result.push({
        id: moduleKey,
        enabled: isEnabled,
        source: 'explicit',
        options: mergedOptions,
      });
    } else if (defaultModule !== undefined) {
      // Fallback sur le défaut du rôle
      const isEnabled = typeof defaultModule === 'boolean'
        ? defaultModule
        : defaultModule?.enabled ?? false;
      
      // Fusionner les options du défaut du rôle avec les valeurs de MODULE_DEFINITIONS
      const defaultOptions = typeof defaultModule === 'object' && defaultModule?.options
        ? defaultModule.options
        : {};
      
      const mergedOptions: Record<string, boolean> = {};
      for (const optDef of moduleDef.options) {
        if (defaultOptions[optDef.key] !== undefined) {
          mergedOptions[optDef.key] = defaultOptions[optDef.key];
        } else {
          mergedOptions[optDef.key] = optDef.defaultEnabled;
        }
      }
        
      result.push({
        id: moduleKey,
        enabled: isEnabled,
        source: 'default',
        options: mergedOptions,
      });
    } else {
      // Module non configuré
      result.push({
        id: moduleKey,
        enabled: false,
        source: 'explicit',
        options: {},
      });
    }
  }
  
  return result;
}

/**
 * Valide les permissions d'un utilisateur et retourne les incohérences
 */
export function validateUserPermissions(ctx: PermissionContext): PermissionIssue[] {
  const issues: PermissionIssue[] = [];
  const { globalRole, enabledModules, agencyId, supportLevel } = ctx;
  
  // Règle 1: N1/N2 sans agence
  if (globalRole && AGENCY_ROLES.includes(globalRole) && !agencyId) {
    issues.push({
      type: 'error',
      code: 'AGENCY_ROLE_NO_AGENCY',
      message: `Le rôle ${globalRole} (agence) nécessite une agence assignée`,
      fix: 'Assigner une agence à cet utilisateur',
    });
  }
  
  // Règle 2: enabled_modules null ou vide
  if (!enabledModules || Object.keys(enabledModules).length === 0) {
    issues.push({
      type: 'warning',
      code: 'NO_EXPLICIT_MODULES',
      message: 'Modules non configurés explicitement (utilise les défauts du rôle)',
      fix: 'Appliquer le template de rôle',
    });
  }
  
  // Règle 3: Modules agence activés pour N3/N4 sans agence
  if (globalRole && ['franchisor_user', 'franchisor_admin'].includes(globalRole) && enabledModules) {
    for (const moduleKey of AGENCY_REQUIRED_MODULES) {
      const moduleState = enabledModules[moduleKey];
      const isEnabled = typeof moduleState === 'boolean' 
        ? moduleState 
        : (moduleState?.enabled ?? false);
        
      if (isEnabled && !agencyId) {
        issues.push({
          type: 'error',
          code: 'NETWORK_ROLE_WITH_AGENCY_MODULES',
          message: `Module ${moduleKey} activé mais N3/N4 sans agence`,
          fix: 'Désactiver le module ou assigner une agence',
          moduleId: moduleKey,
        });
      }
    }
  }
  
  // Règle 4: Support level sans agent option
  if (supportLevel && supportLevel > 0) {
    const aideModule = enabledModules?.['support.aide_en_ligne'] || enabledModules?.aide;
    const isAgentEnabled = typeof aideModule === 'object' 
      ? aideModule?.options?.agent === true
      : false;
      
    if (!isAgentEnabled) {
      issues.push({
        type: 'error',
        code: 'SUPPORT_LEVEL_NO_AGENT',
        message: `Niveau support SA${supportLevel} défini mais option agent non activée`,
        fix: 'Activer support.aide_en_ligne.options.agent ou retirer support_level',
        moduleId: 'support.aide_en_ligne' as ModuleKey,
      });
    }
  }
  
  // Règle 5: Vérifier modules activés vs rôle minimum
  if (enabledModules && globalRole) {
    for (const [key, value] of Object.entries(enabledModules)) {
      const moduleKey = key as ModuleKey;
      const isEnabled = typeof value === 'boolean' ? value : value?.enabled;
      
      if (isEnabled) {
        const minRole = MODULE_MIN_ROLES[moduleKey];
        if (minRole && !hasMinRole(globalRole, minRole)) {
          issues.push({
            type: 'warning',
            code: 'ROLE_BELOW_MODULE_MIN',
            message: `Module ${moduleKey} activé mais rôle insuffisant (min: ${minRole})`,
            fix: `Monter le rôle à ${minRole} minimum ou désactiver le module`,
            moduleId: moduleKey,
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * Explique le processus de décision d'accès (pour debug)
 */
export function explainAccess(params: HasAccessParams): AccessTrace[] {
  const { globalRole, enabledModules, agencyId, moduleId, optionId } = params;
  const traces: AccessTrace[] = [];
  
  // Step 1: Vérifier bypass
  if (globalRole && isBypassRole(globalRole)) {
    traces.push({
      step: 'bypass_check',
      result: true,
      reason: `Rôle ${globalRole} a un bypass total (N5+)`,
    });
    return traces;
  }
  traces.push({
    step: 'bypass_check',
    result: false,
    reason: `Rôle ${globalRole || 'null'} n'a pas de bypass`,
  });
  
  // Step 2: Vérifier rôle minimum
  const minRole = MODULE_MIN_ROLES[moduleId];
  if (minRole) {
    const hasMin = hasMinRole(globalRole, minRole);
    traces.push({
      step: 'min_role_check',
      result: hasMin,
      reason: hasMin 
        ? `Rôle ${globalRole} >= ${minRole} (minimum requis)`
        : `Rôle ${globalRole || 'null'} < ${minRole} (minimum requis)`,
    });
    if (!hasMin) return traces;
  } else {
    traces.push({
      step: 'min_role_check',
      result: true,
      reason: `Pas de rôle minimum défini pour le module ${moduleId}`,
    });
  }
  
  // Step 3: Vérifier agence si nécessaire
  if (AGENCY_REQUIRED_MODULES.includes(moduleId)) {
    const hasAgency = !!agencyId;
    traces.push({
      step: 'agency_check',
      result: hasAgency,
      reason: hasAgency
        ? `Module ${moduleId} nécessite agence → agence présente (${agencyId})`
        : `Module ${moduleId} nécessite agence → AUCUNE AGENCE`,
    });
    if (!hasAgency) return traces;
  }
  
  // Step 4: Vérifier activation du module
  const effectiveModules = getEffectiveModules({ globalRole, enabledModules, agencyId });
  const moduleAccess = effectiveModules.find(m => m.id === moduleId);
  
  traces.push({
    step: 'module_enabled_check',
    result: !!moduleAccess?.enabled,
    reason: moduleAccess?.enabled
      ? `Module ${moduleId} activé (source: ${moduleAccess.source})`
      : `Module ${moduleId} non activé`,
  });
  if (!moduleAccess?.enabled) return traces;
  
  // Step 5: Vérifier option si demandée
  if (optionId) {
    const hasOption = moduleAccess.options?.[optionId] === true;
    traces.push({
      step: 'option_check',
      result: hasOption,
      reason: hasOption
        ? `Option ${optionId} activée dans ${moduleId}`
        : `Option ${optionId} non activée dans ${moduleId}`,
    });
  }
  
  return traces;
}

/**
 * Obtient les modules par défaut pour un rôle donné
 */
export function getDefaultModulesForRole(role: GlobalRole): EnabledModules {
  return DEFAULT_MODULES_BY_ROLE[role] || DEFAULT_MODULES_BY_ROLE.base_user;
}

// ============================================================================
// GESTION UTILISATEURS (repris de roleMatrix.ts)
// ============================================================================

export function getUserManagementCapabilities(role: GlobalRole | null): UserManagementCapabilities {
  if (!role) {
    return {
      viewScope: 'none',
      manageScope: 'none',
      canCreateRoles: [],
      canEditRoles: [],
      canDeactivateRoles: [],
      canDeleteUsers: false,
    };
  }

  switch (role) {
    case 'base_user':
      return {
        viewScope: 'self',
        manageScope: 'none',
        canCreateRoles: [],
        canEditRoles: [],
        canDeactivateRoles: [],
        canDeleteUsers: false,
      };

    case 'franchisee_user':
      return {
        viewScope: 'ownAgency',
        manageScope: 'none',
        canCreateRoles: [],
        canEditRoles: [],
        canDeactivateRoles: [],
        canDeleteUsers: false,
      };

    case 'franchisee_admin':
      return {
        viewScope: 'ownAgency',
        manageScope: 'ownAgency',
        canCreateRoles: ['base_user', 'franchisee_user'],
        canEditRoles: ['base_user', 'franchisee_user'],
        canDeactivateRoles: ['base_user', 'franchisee_user'],
        canDeleteUsers: false,
      };

    case 'franchisor_user':
      return {
        viewScope: 'allAgencies',
        manageScope: 'assignedAgencies',
        canCreateRoles: ['base_user', 'franchisee_user', 'franchisee_admin'],
        canEditRoles: ['base_user', 'franchisee_user', 'franchisee_admin'],
        canDeactivateRoles: ['base_user', 'franchisee_user', 'franchisee_admin'],
        canDeleteUsers: false,
      };

    case 'franchisor_admin':
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user'],
        canEditRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user'],
        canDeactivateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user'],
        canDeleteUsers: false,
      };

    case 'platform_admin':
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin'],
        canEditRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin'],
        canDeactivateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin'],
        canDeleteUsers: true,
      };

    case 'superadmin':
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'],
        canEditRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'],
        canDeactivateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'],
        canDeleteUsers: true,
      };

    default:
      return {
        viewScope: 'none',
        manageScope: 'none',
        canCreateRoles: [],
        canEditRoles: [],
        canDeactivateRoles: [],
        canDeleteUsers: false,
      };
  }
}

// ============================================================================
// HELPERS LEGACY COMPATIBLES
// ============================================================================

/**
 * Wrapper pour la compatibilité avec l'ancien isModuleEnabled
 * Utilise maintenant le moteur unifié
 */
export function isModuleEnabled(ctx: PermissionContext, moduleKey: ModuleKey): boolean {
  return hasAccess({
    ...ctx,
    moduleId: moduleKey,
  });
}

/**
 * Wrapper pour la compatibilité avec l'ancien isModuleOptionEnabled
 * Utilise maintenant le moteur unifié
 */
export function isModuleOptionEnabled(
  ctx: PermissionContext, 
  moduleKey: ModuleKey, 
  optionKey: string
): boolean {
  return hasAccess({
    ...ctx,
    moduleId: moduleKey,
    optionId: optionKey,
  });
}
