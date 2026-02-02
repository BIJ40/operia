/**
 * Hook pour obtenir les modules effectifs d'un utilisateur
 * Combine: modules du plan agence + overrides utilisateur
 * 
 * IMPERSONATION: Utilise useEffectiveAuth pour respecter l'impersonation
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const { isRealUserImpersonation, impersonatedUser } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  
  // Utiliser le globalRole effectif (impersonné ou réel)
  const effectiveGlobalRole = effectiveAuth.globalRole;
  
  // Déterminer l'ID utilisateur pour charger les modules
  // Si impersonation active, charger les modules de l'utilisateur impersonné
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
        // Note: on n'utilise pas enabledModules ici comme fallback car on veut éviter
        // toute dépendance à un cache potentiellement corrompu.
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

      console.log(
        '[useEffectiveModules] Loaded modules for user:',
        effectiveUserId,
        Object.keys(result),
        '(source:',
        source,
        ')'
      );

      return result as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 30, // 30 secondes (au lieu de 5 minutes) pour recharger plus souvent
    gcTime: 1000 * 60 * 2, // 2 minutes de cache
  });
  
  const modules = query.data || {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  // Mapping de rétrocompatibilité BIDIRECTIONNEL: nouveaux modules ↔ anciens équivalents
  const MODULE_COMPAT_MAP: Record<string, string[]> = {
    // Nouveau module → anciens modules à vérifier en fallback
    'stats': ['pilotage_agence', 'agence'],
    'agence': ['pilotage_agence', 'stats'],
    'rh': ['pilotage_agence', 'agence'],
    'guides': ['help_academy'],
    'aide': ['support'],
    'ticketing': ['apogee_tickets'],
    'divers_documents': ['agence', 'pilotage_agence'],
    // Et inversement pour le legacy
    'pilotage_agence': ['agence', 'stats', 'rh', 'divers_documents'],
    'help_academy': ['guides'],
    'support': ['aide'],
    'apogee_tickets': ['ticketing'],
  };
  
  const hasModule = (moduleKey: ModuleKey): boolean => {
    // N5+ bypass - utiliser le rôle RÉEL pour le bypass admin
    // (un admin qui impersonne doit toujours avoir accès à tout)
    if (effectiveAuth.realGlobalRole === 'platform_admin' || effectiveAuth.realGlobalRole === 'superadmin') {
      return true;
    }
    
    // Vérifier le module demandé directement
    if (modules[moduleKey]?.enabled) {
      return true;
    }
    
    // Vérifier les modules équivalents (rétrocompatibilité)
    const compatModules = MODULE_COMPAT_MAP[moduleKey];
    if (compatModules) {
      for (const compatKey of compatModules) {
        if (modules[compatKey as ModuleKey]?.enabled) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  const hasModuleOption = (moduleKey: ModuleKey, optionKey: string): boolean => {
    // N5+ bypass - utiliser le rôle RÉEL pour le bypass admin
    if (effectiveAuth.realGlobalRole === 'platform_admin' || effectiveAuth.realGlobalRole === 'superadmin') {
      return true;
    }
    
    // Vérifier directement sur le module demandé
    if (modules[moduleKey]?.enabled && modules[moduleKey]?.options?.[optionKey]) {
      return true;
    }
    
    // Vérifier sur les modules équivalents
    const compatModules = MODULE_COMPAT_MAP[moduleKey];
    if (compatModules) {
      for (const compatKey of compatModules) {
        const compatModule = modules[compatKey as ModuleKey];
        if (compatModule?.enabled && compatModule?.options?.[optionKey]) {
          return true;
        }
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
