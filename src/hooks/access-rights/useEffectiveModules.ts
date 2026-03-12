/**
 * Hook pour obtenir les modules effectifs d'un utilisateur
 * 
 * CASCADE:
 * 1. Plan agence (plan_tier_modules) → modules de base
 * 2. User overrides (user_modules) → prennent le dessus
 * 3. Filtre par rôle (module_registry.min_role) → côté SERVEUR (RPC)
 * 
 * PHASE 3: COMPAT_MAP — résout les nouvelles clés via les anciennes
 * sans modifier les données ni la RPC.
 * Source unique du COMPAT_MAP: src/permissions/compatMap.ts
 * 
 * IMPERSONATION: Utilise useEffectiveAuth pour respecter l'impersonation
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ModuleKey } from '@/types/modules';
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

export function useEffectiveModules(): EffectiveModulesResult & { isLoading: boolean } {
  const { user } = useAuthCore();
  const { isRealUserImpersonation, impersonatedUser } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  
  const effectiveUserId = isRealUserImpersonation && impersonatedUser 
    ? impersonatedUser.id 
    : user?.id;
  
  const query = useQuery({
    queryKey: ['effective-modules', effectiveUserId, isRealUserImpersonation],
    queryFn: async (): Promise<Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>> => {
      if (isRealUserImpersonation && impersonatedUser?.enabledModules) {
        const result: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};
        for (const [key, value] of Object.entries(impersonatedUser.enabledModules)) {
          const isObj = typeof value === 'object' && value !== null;
          result[key] = {
            enabled: isObj ? ((value as any).enabled ?? false) : (value === true),
            options: isObj ? ((value as any).options ?? {}) : {},
          };
        }
        return result as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
      }
      
      if (!effectiveUserId) return {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;

      const { modules: resolved, source } = await resolveEffectiveModulesFromBackend({
        userId: effectiveUserId,
        agencyId: effectiveAuth.agencyId,
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
  
  const rawModules = query.data || {} as Record<string, { enabled: boolean; options: Record<string, boolean> }>;
  
  // N5+ bypass handled server-side in the RPC
  const isAdminBypass = effectiveAuth.realGlobalRole === 'platform_admin' || effectiveAuth.realGlobalRole === 'superadmin';
  const modules = rawModules;

  /**
   * Resolve a module key — checks direct data first, then COMPAT_MAP fallback.
   * No `as ModuleKey` cast on compat keys to avoid masking runtime mismatches (point #6).
   */
  const hasModule = (moduleKey: ModuleKey): boolean => {
    if (isAdminBypass) return true;
    return !!modules[moduleKey]?.enabled;
  };
  
  const hasModuleOption = (moduleKey: ModuleKey, optionKey: string): boolean => {
    if (isAdminBypass) return true;
    return !!(modules[moduleKey]?.enabled && modules[moduleKey]?.options?.[optionKey]);
  };
  
  return {
    modules,
    hasModule,
    hasModuleOption,
    isLoading: query.isLoading,
  };
}
