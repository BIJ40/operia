/**
 * Mutations pour la gestion utilisateurs
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { monitorEdgeCall } from '@/lib/edge-monitor';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules } from '@/types/modules';
import { UserManagementCapabilities } from '@/config/roleMatrix';
import { enabledModulesToRows } from '@/lib/userModulesUtils';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import { UserProfile, CreateUserData, UpdateUserData } from './types';
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';
import { enforceAgencyRoleFloor } from '@/lib/agencyRoleEnforcement';

interface UseUserMutationsOptions {
  capabilities: UserManagementCapabilities;
  currentUserId?: string;
  currentUserEmail?: string;
  onModificationCleared?: (userId: string) => void;
}

export function useUserMutations({ 
  capabilities, 
  currentUserId, 
  currentUserEmail,
  onModificationCleared 
}: UseUserMutationsOptions) {
  const queryClient = useQueryClient();

  // ✅ SYNCHRONISATION COMPLÈTE: invalide TOUTES les query keys utilisateurs et attend le refetch
  const invalidateUserQueries = async () => {
    const promises = ALL_USER_QUERY_PATTERNS.map(pattern => 
      queryClient.invalidateQueries({ queryKey: [pattern] })
    );
    // Invalider aussi les queries préfixées (agency-users avec slug, user-profile avec id)
    promises.push(queryClient.invalidateQueries({ predicate: (query) => 
      query.queryKey[0] === 'agency-users' || 
      query.queryKey[0] === 'user-profile'
    }));
    await Promise.all(promises);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ userId, globalRole, enabledModules }: { 
      userId: string; 
      globalRole: GlobalRole | null; 
      enabledModules: EnabledModules | null;
    }) => {
      if (globalRole && !capabilities.canEditRoles.includes(globalRole)) {
        throw new Error('Vous ne pouvez pas attribuer ce rôle');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ global_role: globalRole })
        .eq('id', userId);
      if (error) throw error;
      
      await (supabase.from('user_modules' as any) as any).delete().eq('user_id', userId);
      
      if (enabledModules) {
        const moduleRows = enabledModulesToRows(userId, enabledModules, currentUserId);
        if (moduleRows.length > 0) {
          const { error: insertError } = await (supabase.from('user_modules' as any) as any).insert(moduleRows);
          if (insertError) throw insertError;
        }
      }
      
      return { userId, globalRole, enabledModules };
    },
    onSuccess: async ({ userId }) => {
      logAuth.info(`Permissions sauvegardées pour user ${userId}`);
      toast.success('Permissions enregistrées');
      onModificationCleared?.(userId);
      await invalidateUserQueries();
    },
    onError: (error) => {
      logAuth.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      // Le rôle global est celui choisi par l'admin, pas de forçage automatique
      let effectiveGlobalRole = userData.globalRole;
      
      if (!capabilities.canCreateRoles.includes(effectiveGlobalRole)) {
        throw new Error('Vous ne pouvez pas créer un utilisateur avec ce rôle');
      }
      
      const { data, error } = await monitorEdgeCall('create-user', () =>
        supabase.functions.invoke('create-user', { 
          body: { ...userData, globalRole: effectiveGlobalRole } 
        })
      );
      // Edge function returns {error: "message"} in body with non-2xx status
      // SDK puts body in data and generic message in error for non-2xx
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success('Utilisateur créé avec succès');
      await invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      if (!capabilities.canDeactivateRoles.includes(targetUser.global_role!)) {
        throw new Error('Vous ne pouvez pas désactiver cet utilisateur');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: false, 
          deactivated_at: new Date().toISOString(), 
          deactivated_by: currentUserEmail || 'unknown' 
        })
        .eq('id', targetUser.id);
      if (error) throw error;
      return targetUser;
    },
    onSuccess: async (targetUser) => {
      logAuth.info(`[USER_MGMT] Utilisateur désactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été désactivé`);
      await invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true, deactivated_at: null, deactivated_by: null })
        .eq('id', targetUser.id);
      if (error) throw error;
      return targetUser;
    },
    onSuccess: async (targetUser) => {
      logAuth.info(`[USER_MGMT] Utilisateur réactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été réactivé`);
      await invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      if (!capabilities.canDeleteUsers) {
        throw new Error('Vous n\'avez pas les droits pour supprimer définitivement cet utilisateur');
      }
      
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId: targetUser.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return targetUser;
    },
    onSuccess: async (targetUser) => {
      logAuth.info(`[USER_MGMT] Utilisateur SUPPRIMÉ définitivement: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été supprimé définitivement`);
      await invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur suppression: ${error.message}`),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserData }) => {
      const { error } = await supabase.from('profiles').update(data).eq('id', userId);
      if (error) throw error;
      return { userId, data };
    },
    onSuccess: async () => {
      toast.success('Utilisateur mis à jour');
      await invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId, newPassword },
      });
      
      // Extraire le message d'erreur propre du JSON embarqué dans l'erreur SDK
      if (error) {
        let errorMessage = error.message || 'Erreur inconnue';
        const jsonMatch = errorMessage.match(/\{[^}]+\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error) errorMessage = parsed.error;
          } catch { /* garder le message original */ }
        }
        throw new Error(errorMessage);
      }
      
      if (data?.error) throw new Error(data.error);
      return { userId };
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    saveMutation,
    createUserMutation,
    deactivateMutation,
    reactivateMutation,
    hardDeleteMutation,
    updateUserMutation,
    resetPasswordMutation,
  };
}
