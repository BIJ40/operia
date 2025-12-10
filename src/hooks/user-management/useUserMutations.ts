/**
 * Mutations pour la gestion utilisateurs
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules } from '@/types/modules';
import { UserManagementCapabilities } from '@/config/roleMatrix';
import { enabledModulesToRows } from '@/lib/userModulesUtils';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import { UserProfile, CreateUserData, UpdateUserData } from './types';

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

  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['user-management'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    queryClient.invalidateQueries({ queryKey: ['user-modules'] });
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
      
      await supabase.from('user_modules').delete().eq('user_id', userId);
      
      if (enabledModules) {
        const moduleRows = enabledModulesToRows(userId, enabledModules, currentUserId);
        if (moduleRows.length > 0) {
          const { error: insertError } = await supabase.from('user_modules').insert(moduleRows);
          if (insertError) throw insertError;
        }
      }
      
      return { userId, globalRole, enabledModules };
    },
    onSuccess: ({ userId }) => {
      logAuth.info(`Permissions sauvegardées pour user ${userId}`);
      toast.success('Permissions enregistrées');
      onModificationCleared?.(userId);
      invalidateUserQueries();
    },
    onError: (error) => {
      logAuth.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      let effectiveGlobalRole = userData.globalRole;
      if (userData.roleAgence?.toLowerCase() === 'dirigeant') {
        effectiveGlobalRole = 'franchisee_admin';
      }
      
      if (!capabilities.canCreateRoles.includes(effectiveGlobalRole)) {
        throw new Error('Vous ne pouvez pas créer un utilisateur avec ce rôle');
      }
      
      const { data, error } = await supabase.functions.invoke('create-user', { 
        body: { ...userData, globalRole: effectiveGlobalRole } 
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      invalidateUserQueries();
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
    onSuccess: (targetUser) => {
      logAuth.info(`[USER_MGMT] Utilisateur désactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été désactivé`);
      invalidateUserQueries();
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
    onSuccess: (targetUser) => {
      logAuth.info(`[USER_MGMT] Utilisateur réactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été réactivé`);
      invalidateUserQueries();
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
    onSuccess: (targetUser) => {
      logAuth.info(`[USER_MGMT] Utilisateur SUPPRIMÉ définitivement: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été supprimé définitivement`);
      invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur suppression: ${error.message}`),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserData }) => {
      if (data.support_level !== undefined) {
        if (data.support_level > 0 && data.support_level < 1) {
          throw new Error('Le niveau support doit être au minimum 1 (SA1)');
        }
        if (data.support_level === 0) {
          data.support_level = undefined;
        }
      }
      
      const { error } = await supabase.from('profiles').update(data).eq('id', userId);
      if (error) throw error;
      return { userId, data };
    },
    onSuccess: () => {
      toast.success('Utilisateur mis à jour');
      invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId, newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { userId };
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
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
