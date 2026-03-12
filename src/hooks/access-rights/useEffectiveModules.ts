/**
 * @deprecated Utiliser usePermissions() directement depuis '@/contexts/PermissionsContext'
 * 
 * Ce hook est désormais un proxy de compatibilité qui délègue entièrement
 * à usePermissions(). Il sera supprimé dans une version future.
 */

import { usePermissions } from '@/contexts/PermissionsContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
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

/** @deprecated Utiliser usePermissions() directement */
export function useEffectiveModules(): EffectiveModulesResult & { isLoading: boolean } {
  const perms = usePermissions();
  const { isAuthLoading } = useAuthCore();

  // Convertir enabledModules vers le format Record attendu par les anciens consommateurs
  const modules: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};
  if (perms.enabledModules) {
    for (const [key, value] of Object.entries(perms.enabledModules)) {
      if (!value) continue;
      const isObj = typeof value === 'object' && value !== null;
      modules[key] = {
        enabled: isObj ? ((value as any).enabled ?? false) : (value === true),
        options: isObj ? ((value as any).options ?? {}) : {},
      };
    }
  }

  return {
    modules: modules as Record<ModuleKey, { enabled: boolean; options: Record<string, boolean> }>,
    hasModule: perms.hasModule,
    hasModuleOption: perms.hasModuleOption,
    isLoading: isAuthLoading,
  };
}
