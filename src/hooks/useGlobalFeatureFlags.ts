/**
 * Hook pour combiner les Feature Flags globaux avec les modules utilisateur
 * 
 * NOTE: Les feature flags sont un outil de DEV TRACKING (admin).
 * Les permissions réelles sont gérées par MODULE_DEFINITIONS + usePermissions().
 * Ce hook sert uniquement à vérifier si une fonctionnalité est globalement désactivée.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModuleKey } from '@/types/modules';

interface FeatureFlag {
  module_key: string;
  is_enabled: boolean;
}

const QUERY_KEY = 'global-feature-flags';

/**
 * Hook pour charger tous les feature flags globaux
 */
export function useGlobalFeatureFlags() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<Map<string, boolean>> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('module_key, is_enabled');

      if (error) throw error;
      
      const flagsMap = new Map<string, boolean>();
      (data || []).forEach((flag: FeatureFlag) => {
        flagsMap.set(flag.module_key, flag.is_enabled);
      });
      
      return flagsMap;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Vérifie si un module ou une option est activé globalement
 */
export function isFeatureFlagEnabled(
  flagsMap: Map<string, boolean> | undefined,
  moduleKey: ModuleKey,
  optionKey?: string
): boolean {
  if (!flagsMap) return true; // Par défaut activé si pas encore chargé
  
  // Vérifier le module directement
  const parentEnabled = flagsMap.get(moduleKey);
  if (parentEnabled === false) return false;
  
  // Si une option spécifique est demandée
  if (optionKey) {
    const optionEnabled = flagsMap.get(`${moduleKey}.${optionKey}`);
    if (optionEnabled === false) return false;
  }
  
  return true;
}

/**
 * Hook pour vérifier si un module spécifique est activé globalement
 */
export function useIsFeatureEnabled(moduleKey: ModuleKey, optionKey?: string) {
  const { data: flagsMap, isLoading } = useGlobalFeatureFlags();
  
  return {
    isEnabled: isFeatureFlagEnabled(flagsMap, moduleKey, optionKey),
    isLoading,
  };
}
