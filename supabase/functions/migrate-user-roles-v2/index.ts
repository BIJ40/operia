import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hiérarchie des rôles V2.0 (doit correspondre à globalRoles.ts)
const GLOBAL_ROLES = {
  base_user: 0,
  franchisee_user: 1,
  franchisee_admin: 2,
  franchisor_user: 3,
  franchisor_admin: 4,
  platform_admin: 5,
  superadmin: 6,
} as const;

type GlobalRole = keyof typeof GLOBAL_ROLES;

// Modules par défaut par rôle (simplifié pour l'edge function)
const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, Record<string, any>> = {
  base_user: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: false, helpconfort: false, base_documentaire: true, edition: false } },
    support: { enabled: true, options: { user: true, agent: false, admin: false } },
  },
  franchisee_user: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: true, helpconfort: false, base_documentaire: true, edition: false } },
    support: { enabled: true, options: { user: true, agent: false, admin: false } },
  },
  franchisee_admin: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: false } },
    pilotage_agence: { enabled: true, options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true } },
    support: { enabled: true, options: { user: true, agent: false, admin: false } },
  },
  franchisor_user: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: false } },
    pilotage_agence: { enabled: true, options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true } },
    reseau_franchiseur: { enabled: true, options: { dashboard: true, stats: true, agences: true, redevances: false, comparatifs: true } },
    support: { enabled: true, options: { user: true, agent: true, admin: false } },
  },
  franchisor_admin: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: true } },
    pilotage_agence: { enabled: true, options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true } },
    reseau_franchiseur: { enabled: true, options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true } },
    support: { enabled: true, options: { user: true, agent: true, admin: true } },
  },
  platform_admin: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: true } },
    pilotage_agence: { enabled: true, options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true } },
    reseau_franchiseur: { enabled: true, options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true } },
    support: { enabled: true, options: { user: true, agent: true, admin: true } },
    admin_plateforme: { enabled: true, options: { users: true, agencies: true, permissions: true, backup: true, logs: false } },
  },
  superadmin: {
    help_academy: { enabled: true, options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: true } },
    pilotage_agence: { enabled: true, options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true } },
    reseau_franchiseur: { enabled: true, options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true } },
    support: { enabled: true, options: { user: true, agent: true, admin: true } },
    admin_plateforme: { enabled: true, options: { users: true, agencies: true, permissions: true, backup: true, logs: true } },
  },
};

interface LegacyProfile {
  id: string;
  role_agence: string | null;
  system_role: string | null;
  global_role: GlobalRole | null;
  enabled_modules: Record<string, any> | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface FranchiseurRole {
  user_id: string;
  franchiseur_role: string;
}

/**
 * Mappe les données legacy vers le rôle V2.0
 */
function mapLegacyToV2(
  profile: LegacyProfile,
  hasAdminRole: boolean,
  hasFranchiseurRole: boolean,
  franchiseurRole: string | null
): { global_role: GlobalRole; enabled_modules: Record<string, any> } {
  
  // Déterminer le global_role en fonction des données legacy
  let targetRole: GlobalRole = 'base_user';
  
  // Hiérarchie de détection (du plus haut au plus bas)
  if (hasAdminRole) {
    // Admin legacy = platform_admin (N5)
    targetRole = 'platform_admin';
  } else if (hasFranchiseurRole) {
    // Franchiseur avec rôle DG ou Directeur = franchisor_admin (N4)
    if (franchiseurRole === 'dg' || franchiseurRole === 'directeur') {
      targetRole = 'franchisor_admin';
    } else {
      // Animateur = franchisor_user (N3)
      targetRole = 'franchisor_user';
    }
  } else if (profile.role_agence === 'Dirigeant' || profile.role_agence === 'Tête de réseau') {
    // Dirigeant agence = franchisee_admin (N2)
    targetRole = 'franchisee_admin';
  } else if (profile.role_agence === 'Assistante' || profile.role_agence === 'Commercial') {
    // Employé agence = franchisee_user (N1)
    targetRole = 'franchisee_user';
  } else if (profile.role_agence === 'Externe') {
    // Externe = base_user (N0)
    targetRole = 'base_user';
  } else {
    // Par défaut selon system_role
    switch (profile.system_role) {
      case 'admin':
        targetRole = 'platform_admin';
        break;
      case 'support':
        targetRole = 'franchisor_user';
        break;
      case 'utilisateur':
        targetRole = 'franchisee_user';
        break;
      default:
        targetRole = 'base_user';
    }
  }
  
  // Récupérer les modules par défaut pour ce rôle
  const enabled_modules = DEFAULT_MODULES_BY_ROLE[targetRole] || DEFAULT_MODULES_BY_ROLE.base_user;
  
  return { global_role: targetRole, enabled_modules };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client admin avec service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Client authentifié pour vérifier l'appelant
    const supabaseAuth = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // 1) Vérifier l'authentification de l'appelant
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[migrate-user-roles-v2] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Vérifier que l'appelant est admin ou N5+
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();
    
    const isLegacyAdmin = callerRoles?.some(r => r.role === 'admin') || false;
    const callerGlobalRole = callerProfile?.global_role as GlobalRole | null;
    const callerLevel = callerGlobalRole ? GLOBAL_ROLES[callerGlobalRole] : 0;
    
    if (!isLegacyAdmin && callerLevel < 5) {
      console.error('[migrate-user-roles-v2] Forbidden - caller level:', callerLevel);
      return new Response(JSON.stringify({ error: 'Niveau N5+ requis pour la migration batch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[migrate-user-roles-v2] Starting migration by user:', user.id);

    // 3) Récupérer tous les profils
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role_agence, system_role, global_role, enabled_modules');

    if (profilesError || !profiles) {
      console.error('[migrate-user-roles-v2] Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({ error: profilesError?.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4) Récupérer tous les user_roles
    const { data: allUserRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    // 5) Récupérer tous les franchiseur_roles
    const { data: allFranchiseurRoles } = await supabaseAdmin
      .from('franchiseur_roles')
      .select('user_id, franchiseur_role');

    // Créer des maps pour lookup rapide
    const userRolesMap = new Map<string, string[]>();
    (allUserRoles || []).forEach((r: UserRole) => {
      const roles = userRolesMap.get(r.user_id) || [];
      roles.push(r.role);
      userRolesMap.set(r.user_id, roles);
    });

    const franchiseurRolesMap = new Map<string, string>();
    (allFranchiseurRoles || []).forEach((r: FranchiseurRole) => {
      franchiseurRolesMap.set(r.user_id, r.franchiseur_role);
    });

    // 6) Traiter chaque profil
    const updates: { id: string; global_role: GlobalRole; enabled_modules: Record<string, any> }[] = [];
    let skipped = 0;

    for (const profile of profiles as LegacyProfile[]) {
      // Skip si déjà migré (global_role et enabled_modules définis)
      if (profile.global_role && profile.enabled_modules) {
        skipped++;
        continue;
      }

      const userRoles = userRolesMap.get(profile.id) || [];
      const hasAdminRole = userRoles.includes('admin');
      const hasFranchiseurRole = userRoles.includes('franchiseur');
      const franchiseurRole = franchiseurRolesMap.get(profile.id) || null;

      const mapped = mapLegacyToV2(profile, hasAdminRole, hasFranchiseurRole, franchiseurRole);

      updates.push({
        id: profile.id,
        global_role: mapped.global_role,
        enabled_modules: mapped.enabled_modules,
      });
    }

    console.log(`[migrate-user-roles-v2] To migrate: ${updates.length}, Skipped: ${skipped}`);

    if (updates.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Aucun profil à migrer', 
        migrated: 0, 
        skipped 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7) Appliquer les mises à jour
    let migrated = 0;
    let errors: string[] = [];

    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          global_role: update.global_role,
          enabled_modules: update.enabled_modules,
        })
        .eq('id', update.id);

      if (error) {
        errors.push(`${update.id}: ${error.message}`);
      } else {
        migrated++;
      }
    }

    console.log(`[migrate-user-roles-v2] Completed: ${migrated} migrated, ${errors.length} errors`);

    return new Response(JSON.stringify({ 
      migrated, 
      skipped, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[migrate-user-roles-v2] Unexpected error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
