/**
 * Hook pour obtenir les modules effectifs d'un utilisateur
 * Combine: modules du plan agence + overrides utilisateur
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, globalRole } = useAuth();
  
  const query = useQuery({
    queryKey: ['effective-modules', user?.id],
    queryFn: async (): Promise<Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>> => {
      if (!user?.id) return {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
      
      const { data, error } = await supabase.rpc('get_user_effective_modules', {
        p_user_id: user.id
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
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const modules = query.data || {} as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>;
  
  const hasModule = (moduleKey: ModuleKey): boolean => {
    // N5+ bypass
    if (globalRole === 'platform_admin' || globalRole === 'superadmin') {
      return true;
    }
    return modules[moduleKey]?.enabled ?? false;
  };
  
  const hasModuleOption = (moduleKey: ModuleKey, optionKey: string): boolean => {
    // N5+ bypass
    if (globalRole === 'platform_admin' || globalRole === 'superadmin') {
      return true;
    }
    if (!modules[moduleKey]?.enabled) return false;
    return modules[moduleKey]?.options?.[optionKey] ?? false;
  };
  
  return {
    modules,
    hasModule,
    hasModuleOption,
    isLoading: query.isLoading,
  };
}
