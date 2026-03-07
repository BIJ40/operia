/**
 * Hook pour obtenir les modules effectifs d'un utilisateur
 * 
 * CASCADE COMPLÈTE:
 * 1. Plan agence (plan_tier_modules) → modules de base
 * 2. User overrides (user_modules) → prennent le dessus
 * 3. Filtre par rôle (MODULE_DEFINITIONS.minRole) → côté client
 * 4. Projection legacy: clés registre → clés plates (legacyModuleMapping)
 * 
 * IMPERSONATION: Utilise useEffectiveAuth pour respecter l'impersonation
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ModuleKey, MODULE_DEFINITIONS } from '@/types/modules';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { resolveEffectiveModulesFromBackend } from '@/lib/effectiveModulesResolver';
import { projectToLegacyModules } from '@/config/legacyModuleMapping';

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
    if (!moduleDef) {
      result[key] = value;
      continue;
    }
    const minRoleLevel = GLOBAL_ROLES[moduleDef.minRole] ?? 0;
    if (roleLevel >= minRoleLevel) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Merge les clés registre brutes avec la projection legacy.
 * Les clés registre (stats.general, outils.parc.vehicules, etc.) sont projetées
 * vers les clés plates legacy (stats, parc, etc.) attendues par le reste du code.
 * Les deux formats coexistent dans le résultat.
 */
function mergeWithLegacyProjection(
  rawModules: Record<string, { enabled: boolean; options: Record<string, boolean> }>
): Record<string, { enabled: boolean; options: Record<string, boolean> }> {
  const activeKeys = new Set(
    Object.entries(rawModules)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k)
  );

  const legacyProjected = projectToLegacyModules(activeKeys);

  // Merge: legacy projected values are additive (don't overwrite existing)
  const merged = { ...rawModules };
  for (const [legacyKey, legacyValue] of Object.entries(legacyProjected)) {
    if (merged[legacyKey]) {
      // Merge options additively
      merged[legacyKey] = {
        enabled: merged[legacyKey].enabled || legacyValue.enabled,
        options: { ...merged[legacyKey].options, ...legacyValue.options },
      };
    } else {
      merged[legacyKey] = legacyValue;
    }
  }

  return merged;
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

      // Project registry keys to legacy keys
      const withLegacy = mergeWithLegacyProjection(result);

      if (import.meta.env.DEV) {
        console.log(
          '[useEffectiveModules] Loaded modules for user:',
          effectiveUserId,
          Object.keys(withLegacy),
          '(source:',
          source,
          ')'
        );
      }

      return withLegacy as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
  });
  
  const rawModules = query.data || {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  // N5+ bypass: pas de filtrage par rôle
  const isAdminBypass = effectiveAuth.realGlobalRole === 'platform_admin' || effectiveAuth.realGlobalRole === 'superadmin';
  const modules = isAdminBypass 
    ? rawModules 
    : filterByRole(rawModules, effectiveGlobalRole) as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  const hasModule = (moduleKey: ModuleKey): boolean => {
    if (isAdminBypass) return true;
    if (modules[moduleKey]?.enabled) return true;
    
    const compatModules = MODULE_COMPAT_MAP[moduleKey];
    if (compatModules) {
      for (const compatKey of compatModules) {
        if (modules[compatKey as ModuleKey]?.enabled) return true;
      }
    }
    return false;
  };
  
  const hasModuleOption = (moduleKey: ModuleKey, optionKey: string): boolean => {
    if (isAdminBypass) return true;
    if (modules[moduleKey]?.enabled && modules[moduleKey]?.options?.[optionKey]) return true;
    
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
