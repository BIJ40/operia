/**
 * Access Control V2.0
 * 
 * Guards unifiés pour le nouveau système de permissions.
 * Remplace progressivement : isAdmin, isSupport, isFranchiseur, canViewScope, etc.
 */

import { GlobalRole, GLOBAL_ROLES, hasMinimumRole } from './globalRoles';
import { ModuleKey, EnabledModules, isModuleEnabled, isModuleOptionEnabled, canAccessModule } from './modules';

export interface AccessControlContext {
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  // Legacy compatibility
  legacyIsAdmin?: boolean;
  legacyIsSupport?: boolean;
  legacyIsFranchiseur?: boolean;
}

/**
 * Vérifie si l'utilisateur a au minimum le rôle spécifié
 */
export function hasGlobalRole(ctx: AccessControlContext, requiredRole: GlobalRole): boolean {
  return hasMinimumRole(ctx.globalRole, requiredRole);
}

/**
 * Vérifie si l'utilisateur a accès à un module
 */
export function hasModule(ctx: AccessControlContext, moduleKey: ModuleKey): boolean {
  // 1. Vérifier que le rôle permet l'accès au module
  if (!canAccessModule(ctx.globalRole, moduleKey)) return false;
  
  // 2. Vérifier que le module est explicitement activé
  return isModuleEnabled(ctx.enabledModules, moduleKey);
}

/**
 * Vérifie si l'utilisateur a accès à une option de module
 */
export function hasModuleOption(ctx: AccessControlContext, moduleKey: ModuleKey, optionKey: string): boolean {
  // 1. Vérifier l'accès au module parent
  if (!hasModule(ctx, moduleKey)) return false;
  
  // 2. Vérifier l'option spécifique
  return isModuleOptionEnabled(ctx.enabledModules, moduleKey, optionKey);
}

/**
 * Vérifie si l'utilisateur peut éditer le contenu
 */
export function canEdit(ctx: AccessControlContext): boolean {
  return hasModuleOption(ctx, 'help_academy', 'edition') || hasGlobalRole(ctx, 'platform_admin');
}

/**
 * Vérifie si l'utilisateur est admin plateforme
 */
export function isPlatformAdmin(ctx: AccessControlContext): boolean {
  return hasGlobalRole(ctx, 'platform_admin');
}

/**
 * Vérifie si l'utilisateur est superadmin
 */
export function isSuperAdmin(ctx: AccessControlContext): boolean {
  return hasGlobalRole(ctx, 'superadmin');
}

/**
 * Vérifie si l'utilisateur est agent support
 */
export function isSupportAgent(ctx: AccessControlContext): boolean {
  return hasModuleOption(ctx, 'support', 'agent');
}

/**
 * Vérifie si l'utilisateur est admin support
 */
export function isSupportAdmin(ctx: AccessControlContext): boolean {
  return hasModuleOption(ctx, 'support', 'admin');
}

/**
 * Vérifie si l'utilisateur a accès au réseau franchiseur
 */
export function hasFranchisorAccess(ctx: AccessControlContext): boolean {
  return hasModule(ctx, 'reseau_franchiseur');
}

/**
 * Vérifie si l'utilisateur peut gérer les redevances
 */
export function canManageRoyalties(ctx: AccessControlContext): boolean {
  return hasModuleOption(ctx, 'reseau_franchiseur', 'redevances');
}

// =============================================================================
// MAPPING LEGACY -> NOUVEAU SYSTÈME
// =============================================================================

/**
 * Calcule le rôle global depuis les données legacy
 */
export function getGlobalRoleFromLegacy(params: {
  systemRole?: string | null;
  roleAgence?: string | null;
  hasAdminRole?: boolean;
  hasSupportRole?: boolean;
  hasFranchiseurRole?: boolean;
  franchiseurRole?: string | null;
  supportLevel?: number | null;
}): GlobalRole {
  const { systemRole, roleAgence, hasAdminRole, hasSupportRole, hasFranchiseurRole, franchiseurRole, supportLevel } = params;
  
  // N6 - Superadmin : admin avec système role admin
  if (hasAdminRole && systemRole === 'admin') {
    return 'superadmin';
  }
  
  // N5 - Platform admin : support niveau 3 ou admin sans système role admin
  if (hasAdminRole || (hasSupportRole && (supportLevel ?? 1) >= 3)) {
    return 'platform_admin';
  }
  
  // N4 - Franchisor admin : directeur ou DG
  if (hasFranchiseurRole && (franchiseurRole === 'directeur' || franchiseurRole === 'dg')) {
    return 'franchisor_admin';
  }
  
  // N3 - Franchisor user : animateur
  if (hasFranchiseurRole && franchiseurRole === 'animateur') {
    return 'franchisor_user';
  }
  
  // N2 - Franchisee admin : dirigeant d'agence
  if (roleAgence === 'dirigeant' || roleAgence === 'Dirigeant') {
    return 'franchisee_admin';
  }
  
  // N1 - Franchisee user : utilisateurs d'agence standard
  if (systemRole === 'utilisateur' || roleAgence) {
    return 'franchisee_user';
  }
  
  // N0 - Base user : visiteurs ou non défini
  return 'base_user';
}

/**
 * Calcule les modules activés depuis les données legacy
 */
export function getEnabledModulesFromLegacy(params: {
  globalRole: GlobalRole;
  hasAdminRole?: boolean;
  hasSupportRole?: boolean;
  hasFranchiseurRole?: boolean;
  supportLevel?: number | null;
  legacyScopes?: Record<string, number>;
  legacyCapabilities?: string[];
}): EnabledModules {
  const { globalRole, hasAdminRole, hasSupportRole, hasFranchiseurRole, supportLevel, legacyScopes, legacyCapabilities } = params;
  
  const modules: EnabledModules = {};
  
  // Help Academy - accessible à presque tous
  if (GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES.franchisee_user) {
    modules.help_academy = {
      enabled: true,
      options: {
        apogee: true,
        apporteurs: true,
        helpconfort: legacyScopes?.helpconfort !== 0,
        base_documentaire: true,
        edition: hasAdminRole || false,
      },
    };
  }
  
  // Pilotage Agence - dirigeants et plus
  if (GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES.franchisee_admin || legacyScopes?.mes_indicateurs !== 0) {
    modules.pilotage_agence = {
      enabled: true,
      options: {
        indicateurs: true,
        actions_a_mener: true,
        diffusion: true,
        exports: hasAdminRole || false,
      },
    };
  }
  
  // Réseau Franchiseur
  if (hasFranchiseurRole || GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES.franchisor_user) {
    modules.reseau_franchiseur = {
      enabled: true,
      options: {
        dashboard: true,
        stats: true,
        agences: true,
        redevances: GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES.franchisor_admin,
        comparatifs: true,
      },
    };
  }
  
  // Support
  const isSupportCapable = hasSupportRole || legacyCapabilities?.includes('support');
  modules.support = {
    enabled: true,
    options: {
      user: true, // Tous peuvent créer des tickets
      agent: isSupportCapable || false,
      admin: (supportLevel ?? 1) >= 3 || hasAdminRole || false,
    },
  };
  
  // Admin Plateforme
  if (hasAdminRole || GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES.platform_admin) {
    modules.admin_plateforme = {
      enabled: true,
      options: {
        users: true,
        agencies: true,
        permissions: true,
        backup: true,
        logs: globalRole === 'superadmin',
      },
    };
  }
  
  return modules;
}

// =============================================================================
// COMPATIBILITÉ LEGACY (pour transition progressive)
// =============================================================================

/**
 * Crée un contexte d'accès compatible avec le nouveau ET l'ancien système
 */
export function createAccessContext(params: {
  // Nouvelles données (si migrées)
  globalRole?: GlobalRole | null;
  enabledModules?: EnabledModules | null;
  // Données legacy
  systemRole?: string | null;
  roleAgence?: string | null;
  hasAdminRole?: boolean;
  hasSupportRole?: boolean;
  hasFranchiseurRole?: boolean;
  franchiseurRole?: string | null;
  supportLevel?: number | null;
  legacyScopes?: Record<string, number>;
  legacyCapabilities?: string[];
}): AccessControlContext {
  // Si les nouvelles données existent, les utiliser directement
  if (params.globalRole && params.enabledModules) {
    return {
      globalRole: params.globalRole,
      enabledModules: params.enabledModules,
      legacyIsAdmin: params.hasAdminRole,
      legacyIsSupport: params.hasSupportRole,
      legacyIsFranchiseur: params.hasFranchiseurRole,
    };
  }
  
  // Sinon, calculer depuis le legacy
  const globalRole = getGlobalRoleFromLegacy({
    systemRole: params.systemRole,
    roleAgence: params.roleAgence,
    hasAdminRole: params.hasAdminRole,
    hasSupportRole: params.hasSupportRole,
    hasFranchiseurRole: params.hasFranchiseurRole,
    franchiseurRole: params.franchiseurRole,
    supportLevel: params.supportLevel,
  });
  
  const enabledModules = getEnabledModulesFromLegacy({
    globalRole,
    hasAdminRole: params.hasAdminRole,
    hasSupportRole: params.hasSupportRole,
    hasFranchiseurRole: params.hasFranchiseurRole,
    supportLevel: params.supportLevel,
    legacyScopes: params.legacyScopes,
    legacyCapabilities: params.legacyCapabilities,
  });
  
  return {
    globalRole,
    enabledModules,
    legacyIsAdmin: params.hasAdminRole,
    legacyIsSupport: params.hasSupportRole,
    legacyIsFranchiseur: params.hasFranchiseurRole,
  };
}
