/**
 * Access Control V2.0
 * 
 * Guards unifiés pour le système de permissions V2.
 * Source unique de vérité: profiles.global_role + profiles.enabled_modules
 */

import { GlobalRole, GLOBAL_ROLES, hasMinimumRole } from './globalRoles';
import { ModuleKey, EnabledModules, isModuleEnabled, isModuleOptionEnabled, canAccessModule } from './modules';

export interface AccessControlContext {
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
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
