/**
 * Hook pour accéder aux modules utilisateur depuis la table relationnelle user_modules
 * 
 * P3.2 - Normalisation enabled_modules JSONB → table relationnelle
 * Ce hook remplace progressivement l'accès direct à profiles.enabled_modules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ModuleKey, EnabledModules, ModuleOptionsState } from '@/types/modules';

// Type pour une ligne de user_modules
export interface UserModuleRow {
  id: string;
  user_id: string;
  module_key: string;
  options: Record<string, boolean> | null;
  enabled_at: string;
  enabled_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convertit les rows user_modules en format EnabledModules (compatibilité JSONB)
 */
export function rowsToEnabledModules(rows: UserModuleRow[]): EnabledModules {
  const result: EnabledModules = {};
  
  for (const row of rows) {
    const moduleKey = row.module_key as ModuleKey;
    if (row.options && Object.keys(row.options).length > 0) {
      result[moduleKey] = {
        enabled: true,
        options: row.options,
      };
    } else {
      result[moduleKey] = { enabled: true };
    }
  }
  
  return result;
}

/**
 * Convertit EnabledModules en rows pour insertion
 */
export function enabledModulesToRows(
  userId: string, 
  enabledModules: EnabledModules,
  enabledBy?: string
): Omit<UserModuleRow, 'id' | 'created_at' | 'updated_at'>[] {
  const rows: Omit<UserModuleRow, 'id' | 'created_at' | 'updated_at'>[] = [];
  
  for (const [key, value] of Object.entries(enabledModules)) {
    if (!value) continue;
    
    const isEnabled = typeof value === 'boolean' ? value : value.enabled;
    if (!isEnabled) continue;
    
    const options = typeof value === 'object' && value.options 
      ? value.options 
      : null;
    
    rows.push({
      user_id: userId,
      module_key: key,
      options,
      enabled_at: new Date().toISOString(),
      enabled_by: enabledBy || null,
    });
  }
  
  return rows;
}

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
      
      const { data, error } = await supabase
        .from('user_modules')
        .select('*')
        .eq('user_id', targetUserId);
      
      if (error) throw error;
      
      return rowsToEnabledModules(data as UserModuleRow[]);
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
        // Upsert: activer ou mettre à jour le module
        const { error } = await supabase
          .from('user_modules')
          .upsert({
            user_id: userId,
            module_key: moduleKey,
            options: options || null,
            enabled_at: new Date().toISOString(),
            enabled_by: user?.id || null,
          }, {
            onConflict: 'user_id,module_key',
          });
        
        if (error) throw error;
      } else {
        // Delete: désactiver le module
        const { error } = await supabase
          .from('user_modules')
          .delete()
          .eq('user_id', userId)
          .eq('module_key', moduleKey);
        
        if (error) throw error;
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
      const { error } = await supabase
        .from('user_modules')
        .update({ options, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('module_key', moduleKey);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-modules', variables.userId] });
    },
  });
}

/**
 * Mutation pour synchroniser les modules depuis JSONB vers la table
 * Utilisée pour la migration progressive
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
      // Supprimer les anciens modules
      await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId);
      
      // Insérer les nouveaux
      const rows = enabledModulesToRows(userId, enabledModules, user?.id);
      
      if (rows.length > 0) {
        const { error } = await supabase
          .from('user_modules')
          .insert(rows);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-modules', variables.userId] });
    },
  });
}
