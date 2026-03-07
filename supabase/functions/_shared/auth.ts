/**
 * AUTH HELPER CENTRALISÉ - Edge Functions
 * 
 * P0: Centralise la récupération du contexte utilisateur et les vérifications de permissions
 * pour toutes les Edge Functions.
 * 
 * Usage:
 * import { getUserContext, assertRoleAtLeast, assertAgencyAccess } from '../_shared/auth.ts'
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getRoleLevel, GLOBAL_ROLES } from './roles.ts';

export interface UserContext {
  userId: string;
  email: string;
  globalRole: string | null;
  globalRoleLevel: number;
  agencyId: string | null;
  agencySlug: string | null;
  supportLevel: number | null;
}

export interface AuthResult {
  success: true;
  context: UserContext;
  supabase: SupabaseClient;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Récupère le contexte utilisateur complet depuis le JWT et le profil
 * @returns UserContext ou erreur
 */
export async function getUserContext(req: Request): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { success: false, error: 'En-tête d\'autorisation manquant', status: 401 };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  
  if (authErr || !user) {
    return { success: false, error: 'Non autorisé', status: 401 };
  }

  // Charger le profil avec les champs critiques
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('agence, agency_id, global_role, support_level')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return { success: false, error: 'Profil utilisateur non trouvé', status: 400 };
  }

  const globalRoleLevel = getRoleLevel(profile.global_role);

  return {
    success: true,
    context: {
      userId: user.id,
      email: user.email ?? '',
      globalRole: profile.global_role,
      globalRoleLevel,
      agencyId: profile.agency_id,
      agencySlug: profile.agence,
      supportLevel: profile.support_level,
    },
    supabase,
  };
}

/**
 * Vérifie que l'utilisateur a au moins le rôle requis
 * @throws Erreur si le rôle est insuffisant
 */
export function assertRoleAtLeast(
  context: UserContext, 
  minRole: keyof typeof GLOBAL_ROLES
): { allowed: boolean; error?: string } {
  const requiredLevel = GLOBAL_ROLES[minRole];
  
  if (context.globalRoleLevel < requiredLevel) {
    return { 
      allowed: false, 
      error: `Accès refusé: rôle minimum requis N${requiredLevel} (${minRole})` 
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifie que l'utilisateur peut accéder aux données d'une agence
 * - N0-N2: Uniquement leur propre agence
 * - N3+: Accès à toutes les agences
 */
export function assertAgencyAccess(
  context: UserContext, 
  targetAgencySlug: string
): { allowed: boolean; error?: string } {
  // N3+ (franchisor_user+) = accès global
  if (context.globalRoleLevel >= GLOBAL_ROLES.franchisor_user) {
    return { allowed: true };
  }
  
  // N0-N2: uniquement leur propre agence
  if (context.agencySlug !== targetAgencySlug) {
    return { 
      allowed: false, 
      error: 'Accès non autorisé à cette agence' 
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifie si un module est activé pour l'utilisateur
 * DEPRECATED côté Edge: préférer has_module_v2() SQL pour les vérifications DB
 * Gardé pour compatibilité des Edge Functions qui n'ont pas accès à la DB directement
 */
export function hasModule(
  context: UserContext, 
  _moduleKey: string
): boolean {
  // N5+ a accès à tout
  if (context.globalRoleLevel >= GLOBAL_ROLES.platform_admin) {
    return true;
  }
  
  // Edge functions should use SQL has_module_v2() for accurate checks
  // This function is kept as a role-level-only fallback
  return false;
}

/**
 * Vérifie si une option de module est activée
 */
export function hasModuleOption(
  context: UserContext, 
  moduleKey: string, 
  optionKey: string
): boolean {
  // N5+ a accès à tout
  if (context.globalRoleLevel >= GLOBAL_ROLES.platform_admin) {
    return true;
  }
  
  const module = context.enabledModules?.[moduleKey];
  if (!module || typeof module !== 'object') return false;
  
  const options = (module as any).options;
  if (!options || typeof options !== 'object') return false;
  
  return options[optionKey] === true;
}

/**
 * Vérifie si l'utilisateur est un agent support
 */
export function isSupportAgent(context: UserContext): boolean {
  return hasModuleOption(context, 'support', 'agent');
}

/**
 * Vérifie si l'utilisateur est admin RH
 */
export function isRHAdmin(context: UserContext): boolean {
  return hasModuleOption(context, 'rh', 'rh_admin');
}

/**
 * Helper pour vérifier l'accès RH aux données d'un collaborateur
 */
export function canAccessCollaboratorData(
  context: UserContext,
  collaboratorAgencyId: string | null,
  isSelfAccess: boolean
): boolean {
  // Accès à ses propres données
  if (isSelfAccess) return true;
  
  // N6 a accès à tout
  if (context.globalRoleLevel >= GLOBAL_ROLES.superadmin) return true;
  
  // Vérifier même agence + droits RH
  if (collaboratorAgencyId !== context.agencyId) return false;
  
  // RH admin ou dirigeant (N2+) de la même agence
  return isRHAdmin(context) || context.globalRoleLevel >= GLOBAL_ROLES.franchisee_admin;
}
