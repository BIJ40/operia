/**
 * PERMISSIONS ENGINE V1.0 - EDGE FUNCTIONS VERSION
 * ⚠️ SYNCHRONISÉ AVEC: src/permissions/permissionsEngine.ts
 * 📅 Dernière sync: 2025-12-10
 * 
 * RÈGLE: Toute modification doit être répliquée dans les deux fichiers
 * Ce fichier est une version adaptée pour Deno (edge functions)
 */

// ============================================================================
// TYPES (repliqués de src/permissions/types.ts)
// ============================================================================

export type GlobalRole = 
  | 'base_user' 
  | 'franchisee_user' 
  | 'franchisee_admin' 
  | 'franchisor_user' 
  | 'franchisor_admin' 
  | 'platform_admin' 
  | 'superadmin';

export type ModuleKey = 
  | 'help_academy'
  | 'pilotage_agence'
  | 'reseau_franchiseur'
  | 'support'
  | 'admin_plateforme'
  | 'apogee_tickets'
  | 'rh'
  | 'parc'
  | 'messaging'
  | 'unified_search';

export interface PermissionContext {
  globalRole: GlobalRole | null;
  enabledModules?: Record<string, any> | null; // DEPRECATED - kept for signature compat
  agencyId: string | null;
  supportLevel?: number | null;
}

export interface HasAccessParams extends PermissionContext {
  moduleId: ModuleKey;
  optionId?: string;
}

export interface PermissionIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  fix?: string;
  moduleId?: ModuleKey;
}

// ============================================================================
// CONSTANTS (repliqués de src/permissions/constants.ts)
// ============================================================================

export const BYPASS_ROLES: GlobalRole[] = ['superadmin', 'platform_admin'];

export const AGENCY_REQUIRED_MODULES: ModuleKey[] = ['pilotage_agence', 'rh', 'parc'];

export const AGENCY_ROLES: GlobalRole[] = ['franchisee_user', 'franchisee_admin'];

export const NETWORK_MODULES: ModuleKey[] = ['reseau_franchiseur'];

export const NETWORK_MIN_ROLE: GlobalRole = 'franchisor_user';

export const ROLE_HIERARCHY: Record<GlobalRole, number> = {
  base_user: 0,
  franchisee_user: 1,
  franchisee_admin: 2,
  franchisor_user: 3,
  franchisor_admin: 4,
  platform_admin: 5,
  superadmin: 6,
};

export const MODULE_MIN_ROLES: Record<ModuleKey, GlobalRole> = {
  help_academy: 'base_user',
  pilotage_agence: 'franchisee_user',
  reseau_franchiseur: 'franchisor_user',
  support: 'base_user',
  admin_plateforme: 'platform_admin',
  apogee_tickets: 'base_user',
  rh: 'base_user',
  parc: 'franchisee_user',
  messaging: 'franchisee_user',
  unified_search: 'franchisee_user',
};

// ============================================================================
// ENGINE FUNCTIONS
// ============================================================================

export function hasMinRole(role: GlobalRole | null, minRole: GlobalRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

export function getRoleLevel(role: GlobalRole | null): number {
  if (!role) return 0;
  return ROLE_HIERARCHY[role] ?? 0;
}

export function isBypassRole(role: GlobalRole | null): boolean {
  if (!role) return false;
  return BYPASS_ROLES.includes(role);
}

/**
 * FONCTION CENTRALE: Vérifie l'accès à un module/option
 */
export function hasAccess(params: HasAccessParams): boolean {
  const { globalRole, enabledModules, agencyId, moduleId, optionId } = params;
  
  // 1. Bypass N5+
  if (globalRole && isBypassRole(globalRole)) {
    return true;
  }
  
  // 2. Vérifier rôle minimum du module
  const minRole = MODULE_MIN_ROLES[moduleId];
  if (minRole && !hasMinRole(globalRole, minRole)) {
    return false;
  }
  
  // 3. Vérifier si module nécessite agence
  if (AGENCY_REQUIRED_MODULES.includes(moduleId) && !agencyId) {
    return false;
  }
  
  // 4. Vérifier modules réseau
  if (NETWORK_MODULES.includes(moduleId) && !hasMinRole(globalRole, NETWORK_MIN_ROLE)) {
    return false;
  }
  
  // 5. Vérifier activation du module
  if (!enabledModules) return false;
  
  const moduleState = enabledModules[moduleId];
  if (!moduleState) return false;
  
  const isEnabled = typeof moduleState === 'boolean' 
    ? moduleState 
    : moduleState?.enabled ?? false;
    
  if (!isEnabled) return false;
  
  // 6. Vérifier option spécifique
  if (optionId) {
    if (typeof moduleState === 'object' && moduleState?.options) {
      return moduleState.options[optionId] === true;
    }
    return false;
  }
  
  return true;
}

/**
 * Valide les permissions d'un utilisateur
 */
export function validateUserPermissions(ctx: PermissionContext): PermissionIssue[] {
  const issues: PermissionIssue[] = [];
  const { globalRole, enabledModules, agencyId, supportLevel } = ctx;
  
  // Règle 1: N1/N2 sans agence
  if (globalRole && AGENCY_ROLES.includes(globalRole) && !agencyId) {
    issues.push({
      type: 'error',
      code: 'AGENCY_ROLE_NO_AGENCY',
      message: `Le rôle ${globalRole} nécessite une agence`,
      fix: 'Assigner une agence',
    });
  }
  
  // Règle 2: enabled_modules null
  if (!enabledModules || Object.keys(enabledModules).length === 0) {
    issues.push({
      type: 'warning',
      code: 'NO_EXPLICIT_MODULES',
      message: 'Modules non configurés',
      fix: 'Appliquer template rôle',
    });
  }
  
  // Règle 3: Modules agence pour N3/N4 sans agence
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
          message: `Module ${moduleKey} activé sans agence`,
          fix: 'Désactiver ou assigner agence',
          moduleId: moduleKey as ModuleKey,
        });
      }
    }
  }
  
  // Règle 4: Support level sans agent
  if (supportLevel && supportLevel > 0) {
    const supportModule = enabledModules?.support;
    const isAgentEnabled = typeof supportModule === 'object' 
      ? supportModule?.options?.agent === true
      : false;
      
    if (!isAgentEnabled) {
      issues.push({
        type: 'error',
        code: 'SUPPORT_LEVEL_NO_AGENT',
        message: `SA${supportLevel} sans option agent`,
        fix: 'Activer support.agent',
        moduleId: 'support',
      });
    }
  }
  
  return issues;
}

// ============================================================================
// HELPERS FOR EDGE FUNCTIONS
// ============================================================================

/**
 * Extrait le contexte de permissions depuis un profil Supabase
 */
export function extractPermissionContext(profile: any): PermissionContext {
  return {
    globalRole: profile?.global_role || null,
    enabledModules: profile?.enabled_modules || null,
    agencyId: profile?.agency_id || null,
    supportLevel: profile?.support_level || null,
  };
}

/**
 * Vérifie si un utilisateur peut accéder à une edge function
 */
export function canAccessEdgeFunction(
  profile: any, 
  requiredModule?: ModuleKey,
  requiredOption?: string
): { allowed: boolean; reason?: string } {
  const ctx = extractPermissionContext(profile);
  
  // Si pas de module requis, juste vérifier l'authentification
  if (!requiredModule) {
    return { allowed: true };
  }
  
  const allowed = hasAccess({
    ...ctx,
    moduleId: requiredModule,
    optionId: requiredOption,
  });
  
  if (!allowed) {
    return {
      allowed: false,
      reason: `Accès refusé: module ${requiredModule}${requiredOption ? `.${requiredOption}` : ''} non autorisé`,
    };
  }
  
  return { allowed: true };
}
