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
      
      const { data, error } = await supabase.rpc('get_user_effective_modules', {
        p_user_id: effectiveUserId
      });
      
      if (error) {
        console.error('Error fetching effective modules:', error);
        return {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
      }
      
      // Convertir le tableau en Record
      const result: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};
      for (const row of (data || [])) {
        result[row.module_key as string] = {
          enabled: row.enabled as boolean,
          options: (typeof row.options === 'object' && row.options !== null && !Array.isArray(row.options)) 
            ? row.options as Record<string, boolean>
            : {},
        };
      }
      
      return result as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const modules = query.data || {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  // Mapping de rétrocompatibilité: nouveaux modules → anciens équivalents
  const MODULE_COMPAT_MAP: Record<string, string[]> = {
    // Nouveau module → anciens modules à vérifier en fallback
    'stats': ['pilotage_agence'],
    'agence': ['pilotage_agence'],
    'rh': ['pilotage_agence'],
    'guides': ['help_academy'],
    'aide': ['support'],
    'ticketing': ['apogee_tickets'],
    // Et inversement pour le legacy
    'pilotage_agence': ['agence', 'stats', 'rh'],
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
