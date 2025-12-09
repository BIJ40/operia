/**
 * Hook pour combiner les Feature Flags globaux avec les modules utilisateur
 * 
 * Un module est accessible si:
 * 1. Le feature flag global est activé (table feature_flags)
 * 2. ET le module est activé pour l'utilisateur (profiles.enabled_modules)
 * 
 * Les admins (N5+) peuvent accéder même si le feature flag global est désactivé
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Vérifie si un module ou une option est activé globalement
 * @param flagsMap Map des feature flags
 * @param moduleKey Clé du module (ex: 'pilotage_agence')
 * @param optionKey Clé de l'option optionnelle (ex: 'actions_a_mener')
 * @returns true si activé, false sinon
 */
export function isFeatureFlagEnabled(
  flagsMap: Map<string, boolean> | undefined,
  moduleKey: ModuleKey,
  optionKey?: string
): boolean {
  if (!flagsMap) return true; // Par défaut activé si pas encore chargé
  
  // Vérifier d'abord le module parent
  // Les clés dans feature_flags peuvent être:
  // - Module parent: 'pilotage_agence' ou 'pilotage'
  // - Option: 'pilotage.actions-mener' ou 'pilotage_agence.actions_a_mener'
  
  // Mapping des clés de module vers les clés dans feature_flags
  const moduleKeyMappings: Record<string, string[]> = {
    'help_academy': ['help_academy', 'academy'],
    'pilotage_agence': ['pilotage_agence', 'pilotage'],
    'reseau_franchiseur': ['reseau_franchiseur', 'reseau'],
    'support': ['support'],
    'admin_plateforme': ['admin_plateforme', 'admin'],
    'apogee_tickets': ['apogee_tickets', 'projects'],
    'rh': ['rh'],
    'parc': ['parc'],
    'messaging': ['messaging', 'communication'],
    'unified_search': ['unified_search', 'search'],
  };
  
  // Chercher si le module parent est désactivé
  const possibleKeys = moduleKeyMappings[moduleKey] || [moduleKey];
  for (const key of possibleKeys) {
    const parentEnabled = flagsMap.get(key);
    if (parentEnabled === false) return false;
  }
  
  // Si une option spécifique est demandée
  if (optionKey) {
    // Chercher différentes variantes de la clé d'option
    const optionVariants = [
      `${moduleKey}.${optionKey}`,
      `${possibleKeys[1] || moduleKey}.${optionKey}`,
      `${possibleKeys[1] || moduleKey}.${optionKey.replace(/_/g, '-')}`,
      optionKey,
    ];
    
    for (const variant of optionVariants) {
      const optionEnabled = flagsMap.get(variant);
      if (optionEnabled === false) return false;
    }
  }
  
  return true; // Activé par défaut
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
