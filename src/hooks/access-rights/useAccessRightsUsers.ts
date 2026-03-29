/**
 * Hook pour la gestion des utilisateurs dans la Console Droits & Accès
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey } from '@/types/modules';
import { getUserManagementCapabilities, UserManagementCapabilities } from '@/config/roleMatrix';
import { enabledModulesToRows, userModulesToEnabledModules } from '@/lib/userModulesUtils';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import { USER_QUERY_KEYS, ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';

export interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  global_role: GlobalRole | null;
  agency_id: string | null;
  agence: string | null;
  role_agence: string | null;
  is_active: boolean;
  enabled_modules: EnabledModules | null;
  created_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
  must_change_password: boolean | null;
  apogee_user_id: number | null;
  agency?: {
    id: string;
    label: string;
    slug: string;
  } | null;
}

export interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

export function useAccessRightsUsers() {
  const { globalRole } = usePermissions();
  const { agence } = useProfile();
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Get user capabilities
  const capabilities: UserManagementCapabilities = getUserManagementCapabilities(globalRole);
  const currentUserLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;

  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['access-rights-users'],
    queryFn: async (): Promise<UserRow[]> => {
      // Fetch users with optional agency join
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, email, first_name, last_name, global_role, agency_id, agence, role_agence,
          is_active, created_at, deactivated_at, deactivated_by,
          must_change_password, apogee_user_id,
          agency:apogee_agencies(id, label, slug)
        `)
        .order('last_name');
      
      if (profilesError) throw profilesError;
      
      // Fetch user_modules for all users (source of truth for modules)
      const userIds = profilesData?.map(p => p.id) ?? [];
      const { data: modulesData } = await (supabase
        .from('user_modules' as any) as any)
        .select('user_id, module_key, options')
        .in('user_id', userIds);
      
      // Group modules by user_id
      const modulesByUser = new Map<string, { module_key: string; options: unknown }[]>();
      modulesData?.forEach(row => {
        const existing = modulesByUser.get(row.user_id) || [];
        existing.push({ module_key: row.module_key, options: row.options });
        modulesByUser.set(row.user_id, existing);
      });
      
      // Fetch all agencies to resolve by slug when agency_id is null
      const { data: allAgencies } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug');
      
      const agencyBySlug = new Map(allAgencies?.map(a => [a.slug?.toLowerCase(), a]) ?? []);
      
      // Enrich users with modules from user_modules table
      const enrichedUsers = profilesData?.map(user => {
        const userModules = modulesByUser.get(user.id);
        const enabled_modules = userModulesToEnabledModules(userModules ?? []);
        
        let enrichedUser = { ...user, enabled_modules };
        
        if (!user.agency && user.agence) {
          const resolvedAgency = agencyBySlug.get(user.agence.toLowerCase());
          if (resolvedAgency) {
            enrichedUser = { ...enrichedUser, agency: resolvedAgency };
          }
        }
        return enrichedUser;
      }) ?? [];
      
      return enrichedUsers as UserRow[];
    },
  });

  // Fetch all agencies
  const { data: agencies } = useQuery({
    queryKey: ['access-rights-agencies'],
    queryFn: async (): Promise<Agency[]> => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, slug, label, is_active')
        .eq('is_active', true)
        .order('label');
      
      if (error) throw error;
      return data;
    },
  });

  // ✅ SYNCHRONISATION COMPLÈTE: invalide TOUTES les query keys utilisateurs et attend le refetch
  const invalidateQueries = async () => {
    const promises = ALL_USER_QUERY_PATTERNS.map(pattern => 
      queryClient.invalidateQueries({ queryKey: [pattern] })
    );
    // Invalider aussi les queries préfixées (agency-users avec slug)
    promises.push(queryClient.invalidateQueries({ predicate: (query) => 
      query.queryKey[0] === 'agency-users' || 
      query.queryKey[0] === 'user-profile'
    }));
    await Promise.all(promises);
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      agence: string;
      roleAgence: string;
      globalRole: GlobalRole;
      sendEmail: boolean;
    }) => {
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
      // Check body error first (contains the explicit message from edge function)
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      setCreateDialogOpen(false);
      invalidateQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  // Update user mutation - sauvegarde données + modules en une seule action
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data, enabledModules }: { 
      userId: string; 
      data: {
        first_name?: string;
        last_name?: string;
        agence?: string;
        agency_id?: string | null;
        role_agence?: string;
        global_role?: GlobalRole;
        apogee_user_id?: number | null;
        
      };
      enabledModules?: EnabledModules | null;
    }) => {
      // 1. Sauvegarder les données utilisateur
      const { error } = await supabase.from('profiles').update(data).eq('id', userId);
      if (error) throw error;
      
      // 2. Sauvegarder les modules si fournis
      if (enabledModules !== undefined) {
        await (supabase.from('user_modules' as any) as any).delete().eq('user_id', userId);
        
        if (enabledModules) {
          const moduleRows = enabledModulesToRows(userId, enabledModules, user?.id);
          if (moduleRows.length > 0) {
            const { error: insertError } = await (supabase.from('user_modules' as any) as any).insert(moduleRows);
            if (insertError) throw insertError;
          }
        }
      }
      
      return { userId, data, enabledModules };
    },
    onSuccess: async () => {
      toast.success('Modifications enregistrées');
      await invalidateQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async ({ userId, newEmail }: { userId: string; newEmail: string }) => {
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { targetUserId: userId, newEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { userId, newEmail };
    },
    onSuccess: async () => {
      toast.success('Email mis à jour');
      await invalidateQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  // Reset password mutation
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

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: async (targetUser: UserRow) => {
      if (!targetUser.global_role || !capabilities.canDeactivateRoles.includes(targetUser.global_role)) {
        throw new Error('Vous ne pouvez pas désactiver cet utilisateur');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: false, 
          deactivated_at: new Date().toISOString(), 
          deactivated_by: user?.email || 'unknown' 
        })
        .eq('id', targetUser.id);
      if (error) throw error;
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ACCESS_RIGHTS] Utilisateur désactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été désactivé`);
      setDeactivateDialogOpen(false);
      setSelectedUser(null);
      invalidateQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  // Reactivate user mutation
  const reactivateMutation = useMutation({
    mutationFn: async (targetUser: UserRow) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true, deactivated_at: null, deactivated_by: null })
        .eq('id', targetUser.id);
      if (error) throw error;
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ACCESS_RIGHTS] Utilisateur réactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été réactivé`);
      setReactivateDialogOpen(false);
      setSelectedUser(null);
      invalidateQueries();
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  // Hard delete mutation
  const hardDeleteMutation = useMutation({
    mutationFn: async (targetUser: UserRow) => {
      if (!capabilities.canDeleteUsers) {
        throw new Error('Vous n\'avez pas les droits pour supprimer définitivement cet utilisateur');
      }
      
      const { data, error } = await supabase.functions.invoke('delete-user', { 
        body: { userId: targetUser.id } 
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ACCESS_RIGHTS] Utilisateur SUPPRIMÉ définitivement: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été supprimé définitivement`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      invalidateQueries();
    },
    onError: (error: Error) => toast.error(`Erreur suppression: ${error.message}`),
  });

  // Module toggle mutations (utilisé uniquement en standalone si nécessaire)
  const saveModulesMutation = useMutation({
    mutationFn: async ({ userId, enabledModules }: { 
      userId: string; 
      enabledModules: EnabledModules | null;
    }) => {
      await (supabase.from('user_modules' as any) as any).delete().eq('user_id', userId);
      
      if (enabledModules) {
        const moduleRows = enabledModulesToRows(userId, enabledModules, user?.id);
        if (moduleRows.length > 0) {
          const { error: insertError } = await (supabase.from('user_modules' as any) as any).insert(moduleRows);
          if (insertError) throw insertError;
        }
      }
      
      return { userId, enabledModules };
    },
    onSuccess: async () => {
      toast.success('Modules mis à jour');
      await invalidateQueries();
    },
    onError: (error) => {
      logAuth.error('Erreur sauvegarde modules:', error);
      toast.error('Erreur lors de la sauvegarde des modules');
    },
  });

  // Actions handlers
  const openEditDialog = (user: UserRow) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const openDeactivateDialog = (user: UserRow) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const openReactivateDialog = (user: UserRow) => {
    setSelectedUser(user);
    setReactivateDialogOpen(true);
  };

  const openDeleteDialog = (user: UserRow) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Can the current user edit this target user?
  const canEditUser = (targetUser: UserRow): boolean => {
    if (!globalRole) return false;
    if (!targetUser.global_role) return true;
    return capabilities.canEditRoles.includes(targetUser.global_role);
  };

  return {
    // Data
    users: users ?? [],
    agencies: agencies ?? [],
    isLoading: isLoadingUsers,
    capabilities,
    currentUserLevel,
    currentUserAgency: agence ?? null,
    
    // Selected user
    selectedUser,
    setSelectedUser,
    
    // Dialog states
    editDialogOpen,
    setEditDialogOpen,
    createDialogOpen,
    setCreateDialogOpen,
    deactivateDialogOpen,
    setDeactivateDialogOpen,
    reactivateDialogOpen,
    setReactivateDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    
    // Mutations
    createUserMutation,
    updateUserMutation,
    updateEmailMutation,
    resetPasswordMutation,
    deactivateMutation,
    reactivateMutation,
    hardDeleteMutation,
    saveModulesMutation,
    
    // Handlers
    openEditDialog,
    openDeactivateDialog,
    openReactivateDialog,
    openDeleteDialog,
    canEditUser,
  };
}
