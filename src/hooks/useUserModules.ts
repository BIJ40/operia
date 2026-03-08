/**
 * Hook pour accéder aux modules utilisateur depuis la table relationnelle user_modules
 * 
 * MIGRATED: Uses userModulesRepository for data access
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { ModuleKey, EnabledModules } from '@/types/modules';
import { 
  userModulesToEnabledModules, 
  enabledModulesToRows,
  type UserModuleRow as UtilsModuleRow,
  type UserModuleReadRow 
} from '@/lib/userModulesUtils';
import {
  listUserModules,
  upsertUserModule,
  deleteUserModule,
  deleteAllUserModules,
  bulkInsertUserModules,
} from '@/repositories/userModulesRepository';

// Re-export des types pour compatibilité
export type { UtilsModuleRow as UserModuleRow, UserModuleReadRow };

// Re-export des fonctions de conversion pour compatibilité avec le code existant
export { userModulesToEnabledModules as rowsToEnabledModules, enabledModulesToRows };

/**
 * Hook principal pour récupérer les modules d'un utilisateur
 */
export function useUserModules(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  return useQuery({
    queryKey: ['user-modules', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const data = await listUserModules(targetUserId);
      return userModulesToEnabledModules(data);
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour vérifier si un module spécifique est activé
 */
export function useHasModule(moduleKey: ModuleKey, userId?: string) {
  const { data: modules, isLoading } = useUserModules(userId);
  
  if (isLoading || !modules) return { hasModule: false, isLoading };
  
  const moduleState = modules[moduleKey];
  const hasModule = typeof moduleState === 'boolean' 
    ? moduleState 
    : moduleState?.enabled ?? false;
  
  return { hasModule, isLoading: false };
}

/**
 * Hook pour vérifier si une option de module est activée
 */
export function useHasModuleOption(
  moduleKey: ModuleKey, 
  optionKey: string, 
  userId?: string
) {
  const { data: modules, isLoading } = useUserModules(userId);
  
  if (isLoading || !modules) return { hasOption: false, isLoading };
  
  const moduleState = modules[moduleKey];
  if (!moduleState) return { hasOption: false, isLoading: false };
  
  if (typeof moduleState === 'boolean') {
    return { hasOption: moduleState, isLoading: false };
  }
  
  const hasOption = moduleState.enabled && (moduleState.options?.[optionKey] ?? false);
  return { hasOption, isLoading: false };
}

/**
 * Mutation pour activer/désactiver un module
 */
export function useToggleModule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      moduleKey, 
      enabled, 
      options 
    }: { 
      userId: string; 
      moduleKey: ModuleKey; 
      enabled: boolean;
      options?: Record<string, boolean>;
    }) => {
      if (enabled) {
        await upsertUserModule({
          userId,
          moduleKey,
          options: options || null,
          enabledBy: user?.id || null,
        });
      } else {
        await deleteUserModule(userId, moduleKey);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-modules', variables.userId] });
    },
  });
}

/**
 * Mutation pour mettre à jour les options d'un module
 */
export function useUpdateModuleOptions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      moduleKey, 
      options 
    }: { 
      userId: string; 
      moduleKey: ModuleKey; 
      options: Record<string, boolean>;
    }) => {
      await upsertUserModule({
        userId,
        moduleKey,
        options,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-modules', variables.userId] });
    },
  });
}

/**
 * Mutation pour synchroniser les modules depuis JSONB vers la table
 */
export function useSyncModulesFromJsonb() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      enabledModules 
    }: { 
      userId: string; 
      enabledModules: EnabledModules;
    }) => {
      await deleteAllUserModules(userId);
      
      const rows = enabledModulesToRows(userId, enabledModules, user?.id);
      
      if (rows.length > 0) {
        await bulkInsertUserModules(
          rows.map(r => ({
            user_id: r.user_id,
            module_key: r.module_key,
            options: r.options,
            enabled_at: r.enabled_at || new Date().toISOString(),
            enabled_by: r.enabled_by || null,
          }))
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-modules', variables.userId] });
    },
  });
}
