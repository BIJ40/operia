/**
 * Hook pour obtenir les modules effectifs d'un utilisateur
 * 
 * CASCADE COMPLÈTE:
 * 1. Plan agence (plan_tier_modules) → modules de base
 * 2. User overrides (user_modules) → prennent le dessus
 * 3. Filtre par rôle (MODULE_DEFINITIONS.minRole) → côté client
 * 
 * IMPERSONATION: Utilise useEffectiveAuth pour respecter l'impersonation
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ModuleKey, MODULE_DEFINITIONS, GLOBAL_ROLES } from '@/types/modules';
import { GlobalRole } from '@/types/globalRoles';
import { resolveEffectiveModulesFromBackend } from '@/lib/effectiveModulesResolver';

export interface EffectiveModuleRow {
  module_key: string;
  enabled: boolean;
  options: Record<string, boolean>;
}

export interface EffectiveModulesResult {
  modules: Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  hasModule: (moduleKey: ModuleKey) => boolean;
  hasModuleOption: (moduleKey: ModuleKey, optionKey: string) => boolean;
}

// Mapping de rétrocompatibilité BIDIRECTIONNEL: nouveaux modules ↔ anciens équivalents
const MODULE_COMPAT_MAP: Record<string, string[]> = {
  'stats': ['pilotage_agence', 'agence'],
  'agence': ['pilotage_agence', 'stats'],
  'rh': ['pilotage_agence', 'agence'],
  'guides': ['help_academy'],
  'aide': ['support'],
  'ticketing': ['apogee_tickets'],
  'divers_documents': ['agence', 'pilotage_agence'],
  'prospection': ['agence', 'pilotage_agence'],
  'pilotage_agence': ['agence', 'stats', 'rh', 'divers_documents', 'prospection'],
  'help_academy': ['guides'],
  'support': ['aide'],
  'apogee_tickets': ['ticketing'],
};

/**
 * Filtre les modules par le rôle minimum requis (MODULE_DEFINITIONS.minRole)
 * Les modules non définis dans MODULE_DEFINITIONS passent le filtre (legacy compat)
 */
function filterByRole(
  modules: Record<string, { enabled: boolean; options: Record<string, boolean> }>,
  globalRole: GlobalRole | null
): Record<string, { enabled: boolean; options: Record<string, boolean> }> {
  if (!globalRole) return {};
  
  const roleLevel = GLOBAL_ROLES[globalRole] ?? 0;
  const result: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};
  
  for (const [key, value] of Object.entries(modules)) {
    const moduleDef = MODULE_DEFINITIONS.find(m => m.key === key);
    
    // Si pas de définition (legacy module), laisser passer
    if (!moduleDef) {
      result[key] = value;
      continue;
    }
    
    // Vérifier minRole
    const minRoleLevel = GLOBAL_ROLES[moduleDef.minRole] ?? 0;
    if (roleLevel >= minRoleLevel) {
      result[key] = value;
    }
  }
  
  return result;
}

export function useEffectiveModules(): EffectiveModulesResult & { isLoading: boolean } {
  const { user } = useAuth();
  const { isRealUserImpersonation, impersonatedUser } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  
  const effectiveGlobalRole = effectiveAuth.globalRole;
  
  const effectiveUserId = isRealUserImpersonation && impersonatedUser 
    ? impersonatedUser.id 
    : user?.id;
  
  const query = useQuery({
    queryKey: ['effective-modules', effectiveUserId, isRealUserImpersonation],
    queryFn: async (): Promise<Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>> => {
      // Si impersonation active, utiliser directement les modules de l'utilisateur impersonné
      if (isRealUserImpersonation && impersonatedUser?.enabledModules) {
        const result: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};
        for (const [key, value] of Object.entries(impersonatedUser.enabledModules)) {
          result[key] = {
            enabled: value?.enabled ?? false,
            options: value?.options ?? {},
          };
        }
        return result as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
      }
      
      if (!effectiveUserId) return {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;

      const { modules: resolved, source } = await resolveEffectiveModulesFromBackend({
        userId: effectiveUserId,
        agencyId: effectiveAuth.agencyId,
        profileEnabledModules: null,
        debugLabel: 'useEffectiveModules',
      });

      // Convertir EnabledModules -> Record attendu par ce hook
      const result: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};
      for (const [key, value] of Object.entries(resolved || {})) {
        if (!value) continue;
        const enabled = typeof value === 'boolean' ? value : (value as any).enabled === true;
        const optionsRaw =
          typeof value === 'object' && value !== null && 'options' in (value as any)
            ? (value as any).options
            : {};

        result[key] = {
          enabled,
          options:
            typeof optionsRaw === 'object' && optionsRaw !== null && !Array.isArray(optionsRaw)
              ? (optionsRaw as Record<string, boolean>)
              : {},
        };
      }

      if (import.meta.env.DEV) {
        console.log(
          '[useEffectiveModules] Loaded modules for user:',
          effectiveUserId,
          Object.keys(result),
          '(source:',
          source,
          ')'
        );
      }

      return result as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
  });
  
  // Appliquer le filtre par rôle côté client (étape 3 de la cascade)
  const rawModules = query.data || {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  // N5+ bypass: pas de filtrage par rôle
  const isAdminBypass = effectiveAuth.realGlobalRole === 'platform_admin' || effectiveAuth.realGlobalRole === 'superadmin';
  const modules = isAdminBypass 
    ? rawModules 
    : filterByRole(rawModules, effectiveGlobalRole) as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  const hasModule = (moduleKey: ModuleKey): boolean => {
    // N5+ bypass
    if (isAdminBypass) return true;
    
    // Vérifier le module demandé directement
    if (modules[moduleKey]?.enabled) return true;
    
    // Vérifier les modules équivalents (rétrocompatibilité)
    const compatModules = MODULE_COMPAT_MAP[moduleKey];
    if (compatModules) {
      for (const compatKey of compatModules) {
        if (modules[compatKey as ModuleKey]?.enabled) return true;
      }
    }
    
    return false;
  };
  
  const hasModuleOption = (moduleKey: ModuleKey, optionKey: string): boolean => {
    // N5+ bypass
    if (isAdminBypass) return true;
    
    // Vérifier directement sur le module demandé
    if (modules[moduleKey]?.enabled && modules[moduleKey]?.options?.[optionKey]) return true;
    
    // Vérifier sur les modules équivalents
    const compatModules = MODULE_COMPAT_MAP[moduleKey];
    if (compatModules) {
      for (const compatKey of compatModules) {
        const compatModule = modules[compatKey as ModuleKey];
        if (compatModule?.enabled && compatModule?.options?.[optionKey]) return true;
      }
    }
    
    return false;
  };
  
  return {
    modules,
    hasModule,
    hasModuleOption,
    isLoading: query.isLoading,
  };
}
