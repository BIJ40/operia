/**
 * PERMISSIONS ENGINE V3.0 - EDGE FUNCTIONS VERSION
 * 
 * ⚠️ SYNCHRONISED WITH: src/permissions/shared-constants.ts
 *    (canonical source of truth for role hierarchy + module rules)
 * ⚠️ SYNCHRONISED WITH: src/permissions/permissionsEngine.ts
 *    (full frontend engine with getEffectiveModules, explainAccess, etc.)
 * 
 * 📅 Last sync: 2026-03-07
 * 
 * This file is a Deno-compatible SUBSET. The frontend engine has additional
 * features (getEffectiveModules, explainAccess, getUserManagementCapabilities)
 * that are NOT needed in Edge Functions.
 */

// ============================================================================
// TYPES (repliqués de src/types/globalRoles.ts + src/types/modules.ts)
// ============================================================================

export type GlobalRole = 
  | 'base_user' 
  | 'franchisee_user' 
  | 'franchisee_admin' 
  | 'franchisor_user' 
  | 'franchisor_admin' 
  | 'platform_admin' 
  | 'superadmin';

// ModuleKey V3 — aligné avec src/types/modules.ts
// Legacy + hierarchical keys (Phase 10 — legacy removed)
export type ModuleKey = 
  // Non-migrated legacy (still canonical)
  | 'ticketing'
  | 'prospection'
  | 'planning_augmente'
  | 'reseau_franchiseur'
  | 'admin_plateforme'
  | 'unified_search'
  // Hierarchical (Phase 7+10)
  | 'pilotage.agence'
  | 'pilotage.statistiques'
  | 'organisation.salaries'
  | 'organisation.parc'
  | 'organisation.apporteurs'
  | 'organisation.plannings'
  | 'organisation.reunions'
  | 'mediatheque.documents'
  | 'support.aide_en_ligne'
  | 'support.guides'
  | 'commercial.realisations';

// Legacy module keys → V3 mapping (pour rétrocompat des données en base)
export const MODULE_COMPAT_MAP: Record<string, ModuleKey> = {
  'help_academy': 'support.guides',
  'pilotage_agence': 'pilotage.agence',
  'support': 'support.aide_en_ligne',
  'apogee_tickets': 'ticketing',
  'messaging': 'support.aide_en_ligne',
};

export interface PermissionContext {
  globalRole: GlobalRole | null;
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
// CONSTANTS (synchronisés avec src/permissions/constants.ts)
// ============================================================================

export const BYPASS_ROLES: GlobalRole[] = ['superadmin', 'platform_admin'];

export const AGENCY_REQUIRED_MODULES: ModuleKey[] = [
  'agence', 'rh', 'parc', 'prospection',
  'pilotage.agence', 'organisation.salaries', 'organisation.parc',
];

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

// Derived from MODULE_DEFINITIONS canonical source (src/types/modules.ts)
// Edge functions can't import from src/, so this is a synced copy.
// Last sync: 2026-03-08
export const MODULE_MIN_ROLES: Partial<Record<ModuleKey, GlobalRole>> = {
  // Non-migrated legacy
  ticketing: 'base_user',
  prospection: 'franchisee_admin',
  planning_augmente: 'franchisee_admin',
  reseau_franchiseur: 'franchisor_user',
  admin_plateforme: 'platform_admin',
  // Hierarchical (Phase 7+10)
  'pilotage.agence': 'franchisee_admin',
  'pilotage.statistiques': 'franchisee_admin',
  'organisation.salaries': 'franchisee_admin',
  'organisation.parc': 'franchisee_admin',
  'organisation.apporteurs': 'franchisee_admin',
  'organisation.plannings': 'franchisee_admin',
  'organisation.reunions': 'franchisee_admin',
  'mediatheque.documents': 'franchisee_admin',
  'support.aide_en_ligne': 'base_user',
  'support.guides': 'base_user',
  'commercial.realisations': 'franchisee_admin',
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
 * Normalise un module_key legacy vers V3
 */
export function normalizeModuleKey(key: string): ModuleKey | null {
  // Check all known module keys (MODULE_MIN_ROLES covers all canonical keys)
  const ALL_MODULE_KEYS: ModuleKey[] = [
    // Non-migrated legacy
    'ticketing', 'prospection', 'planning_augmente',
    'reseau_franchiseur', 'admin_plateforme', 'unified_search',
    // Hierarchical (Phase 7+10)
    'pilotage.agence', 'pilotage.statistiques',
    'organisation.salaries', 'organisation.parc', 'organisation.apporteurs',
    'organisation.plannings', 'organisation.reunions',
    'mediatheque.documents',
    'support.aide_en_ligne', 'support.guides',
    'commercial.realisations',
  ];
  if (ALL_MODULE_KEYS.includes(key as ModuleKey)) return key as ModuleKey;
  if (key in MODULE_COMPAT_MAP) return MODULE_COMPAT_MAP[key];
  return null;
}

/**
 * FONCTION CENTRALE: Vérifie l'accès à un module/option
 * Version edge simplifiée — la RPC get_user_effective_modules gère la cascade complète
 */
export function hasAccess(params: HasAccessParams): boolean {
  const { globalRole, agencyId, moduleId } = params;
  
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
  
  // Note: la vérification enabled_modules est déléguée à la RPC SQL côté serveur
  // Les edge functions utilisent canAccessEdgeFunction() qui appelle hasAccess() pour les checks rôle/agence
  return true;
}

/**
 * Valide les permissions d'un utilisateur
 */
export function validateUserPermissions(ctx: PermissionContext): PermissionIssue[] {
  const issues: PermissionIssue[] = [];
  const { globalRole, agencyId, supportLevel } = ctx;
  
  // Règle 1: N1/N2 sans agence
  if (globalRole && AGENCY_ROLES.includes(globalRole) && !agencyId) {
    issues.push({
      type: 'error',
      code: 'AGENCY_ROLE_NO_AGENCY',
      message: `Le rôle ${globalRole} nécessite une agence`,
      fix: 'Assigner une agence',
    });
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
    agencyId: profile?.agency_id || null,
    supportLevel: profile?.support_level || null,
  };
}

/**
 * Vérifie si un utilisateur peut accéder à une edge function
 */
export function canAccessEdgeFunction(
  profile: any, 
  requiredModule?: ModuleKey | string,
  requiredOption?: string
): { allowed: boolean; reason?: string } {
  const ctx = extractPermissionContext(profile);
  
  // Si pas de module requis, juste vérifier l'authentification
  if (!requiredModule) {
    return { allowed: true };
  }
  
  // Normaliser la clé de module (legacy → V3)
  const normalizedModule = normalizeModuleKey(requiredModule);
  if (!normalizedModule) {
    return {
      allowed: false,
      reason: `Module inconnu: ${requiredModule}`,
    };
  }
  
  const allowed = hasAccess({
    ...ctx,
    moduleId: normalizedModule,
    optionId: requiredOption,
  });
  
  if (!allowed) {
    return {
      allowed: false,
      reason: `Accès refusé: module ${normalizedModule}${requiredOption ? `.${requiredOption}` : ''} non autorisé`,
    };
  }
  
  return { allowed: true };
}
