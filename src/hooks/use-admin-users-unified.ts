import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalRole, getRoleLevel, GLOBAL_ROLES, getAssignableRoles } from '@/types/globalRoles';
import { getUserManagementCapabilities, canViewUser, canManageUser, canDeactivateUser as canDeactivateUserHelper } from '@/config/roleMatrix';
import { EnabledModules, ModuleOptionsState, ModuleKey, MODULE_DEFINITIONS } from '@/types/modules';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { useAdminAgencies } from './use-admin-agencies';

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
  role_agence: string | null;
  created_at: string;
  is_active: boolean | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  must_change_password: boolean | null;
}

const PAGE_SIZE = 20;

export function useAdminUsersUnified() {
  const queryClient = useQueryClient();
  const { globalRole, suggestedGlobalRole, isAdmin, user, agence: currentUserAgency } = useAuth();
  
  // Permissions
  const effectiveUserRole = globalRole ?? suggestedGlobalRole;
  const currentUserLevel = getRoleLevel(effectiveUserRole);
  const userManagementCaps = useMemo(
    () => getUserManagementCapabilities(effectiveUserRole),
    [effectiveUserRole]
  );
  
  const canAccessPage = userManagementCaps.viewScope !== 'none' || isAdmin;
  const canCreateUsers = userManagementCaps.canCreateRoles.length > 0;
  const canDeleteUsers = userManagementCaps.canDeleteUsers;
  // ✅ SÉCURITÉ CRITIQUE : Utiliser getAssignableRoles() pour éviter escalade de privilèges
  const assignableRoles = useMemo(() => getAssignableRoles(effectiveUserRole), [effectiveUserRole]);
  const isSuperAdmin = effectiveUserRole === 'superadmin';

  // Permission checks
  const canEditUser = (targetRole: GlobalRole | null, targetAgency: string | null): boolean => {
    return canManageUser(effectiveUserRole, currentUserAgency, targetRole, targetAgency);
  };
  
  const canDeactivateUserCheck = (targetRole: GlobalRole | null): boolean => {
    return canDeactivateUserHelper(effectiveUserRole, targetRole);
  };
  
  const canDeleteUser = (targetRole: GlobalRole | null): boolean => {
    if (!canDeleteUsers) return false;
    return canDeactivateUserHelper(effectiveUserRole, targetRole);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Modified users tracking
  const [modifiedUsers, setModifiedUsers] = useState<Record<string, {
    global_role?: GlobalRole | null;
    enabled_modules?: EnabledModules | null;
  }>>({});

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-unified'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, global_role, enabled_modules, role_agence, created_at, is_active, deactivated_at, deactivated_by, must_change_password')
        .order('email');
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Filter users based on viewScope
  const visibleUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(u => {
      if (userManagementCaps.viewScope === 'self') {
        return u.id === user?.id;
      }
      return canViewUser(effectiveUserRole, currentUserAgency, u.agence);
    });
  }, [users, userManagementCaps, effectiveUserRole, currentUserAgency, user?.id]);

  // Fetch agencies from apogee_agencies table
  const { data: agencies = [] } = useAdminAgencies();

  // Module check helper
  const isModuleEnabledForUser = (modules: EnabledModules, moduleKey: ModuleKey): boolean => {
    const state = modules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return visibleUsers.filter(user => {
      const isUserActive = user.is_active !== false;
      if (!showDeactivated && !isUserActive) return false;
      
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const agence = (user.agence || '').toLowerCase();
        if (!fullName.includes(search) && !email.includes(search) && !agence.includes(search)) {
          return false;
        }
      }
      
      if (agencyFilter !== 'all') {
        if (agencyFilter === 'none' && user.agence) return false;
        if (agencyFilter !== 'none' && user.agence !== agencyFilter) return false;
      }
      
      if (roleFilter !== 'all') {
        const effectiveRole = modifiedUsers[user.id]?.global_role ?? user.global_role;
        if (effectiveRole !== roleFilter) return false;
      }

      if (moduleFilter !== 'all') {
        const effectiveModules = modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};
        if (!isModuleEnabledForUser(effectiveModules, moduleFilter as ModuleKey)) return false;
      }
      
      return true;
    });
  }, [visibleUsers, searchQuery, agencyFilter, roleFilter, moduleFilter, modifiedUsers, showDeactivated]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ userId, globalRole, enabledModules }: { 
      userId: string; 
      globalRole: GlobalRole | null; 
      enabledModules: EnabledModules | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ global_role: globalRole, enabled_modules: enabledModules as Json })
        .eq('id', userId);
      if (error) throw error;
      return { userId, globalRole, enabledModules };
    },
    onSuccess: ({ userId }) => {
      logAuth.info(`Permissions sauvegardées pour user ${userId}`);
      toast.success('Permissions enregistrées');
      setModifiedUsers(prev => { const next = { ...prev }; delete next[userId]; return next; });
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error) => {
      logAuth.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; firstName: string; lastName: string; agence: string; globalRole: GlobalRole; sendEmail: boolean }) => {
      const { data, error } = await supabase.functions.invoke('create-user', { body: userData });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, deactivated_at: new Date().toISOString(), deactivated_by: user?.email || 'unknown' })
        .eq('id', targetUser.id);
      if (error) throw error;
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ADMIN] Utilisateur désactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été désactivé`);
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
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
      logAuth.info(`[ADMIN] Utilisateur réactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été réactivé`);
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId: targetUser.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return targetUser;
    },
    onSuccess: (targetUser) => {
      logAuth.info(`[ADMIN] Utilisateur SUPPRIMÉ définitivement: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été supprimé définitivement`);
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => toast.error(`Erreur suppression: ${error.message}`),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: { first_name?: string; last_name?: string; agence?: string; role_agence?: string; support_level?: number; global_role?: GlobalRole } }) => {
      const updateData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        agence: data.agence,
        role_agence: data.role_agence,
        global_role: data.global_role,
      };
      
      // Si support_level fourni, mettre à jour enabled_modules.support.options.level
      if (data.support_level !== undefined) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('enabled_modules')
          .eq('id', userId)
          .single();
        
        const modules = (currentProfile?.enabled_modules as any) || {};
        const supportModule = modules.support || { enabled: false };
        const supportOptions = supportModule.options || {};
        
        updateData.enabled_modules = {
          ...modules,
          support: {
            ...supportModule,
            options: {
              ...supportOptions,
              level: data.support_level,
            }
          }
        };
      }
      
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;
      return userId;
    },
    onSuccess: () => {
      toast.success('Informations mises à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ userId, newEmail }: { userId: string; newEmail: string }) => {
      const { data, error } = await supabase.functions.invoke('update-user-email', { body: { targetUserId: userId, newEmail } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Email mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', { body: { targetUserId: userId, newPassword } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
      queryClient.invalidateQueries({ queryKey: ['admin-users-unified'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  // Handlers
  const saveChanges = (userId: string) => {
    const targetUser = visibleUsers.find(u => u.id === userId);
    const changes = modifiedUsers[userId];
    if (!targetUser || !changes) return;
    
    saveMutation.mutate({
      userId,
      globalRole: changes.global_role ?? targetUser.global_role,
      enabledModules: changes.enabled_modules ?? targetUser.enabled_modules,
    });
  };

  const handleRoleChange = (userId: string, role: GlobalRole) => {
    setModifiedUsers(prev => ({ ...prev, [userId]: { ...prev[userId], global_role: role } }));
  };

  const handleModuleToggle = (userId: string, moduleKey: ModuleKey, enabled: boolean) => {
    const targetUser = visibleUsers.find(u => u.id === userId);
    if (!targetUser) return;
    
    const currentModules = modifiedUsers[userId]?.enabled_modules ?? targetUser.enabled_modules ?? {};
    const moduleState = currentModules[moduleKey];
    
    let newModuleState: ModuleOptionsState;
    if (typeof moduleState === 'object') {
      newModuleState = { ...moduleState, enabled };
    } else {
      const moduleDef = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
      const defaultOptions: Record<string, boolean> = {};
      moduleDef?.options.forEach(opt => { defaultOptions[opt.key] = opt.defaultEnabled; });
      newModuleState = { enabled, options: defaultOptions };
    }
    
    setModifiedUsers(prev => ({
      ...prev,
      [userId]: { ...prev[userId], enabled_modules: { ...currentModules, [moduleKey]: newModuleState } },
    }));
  };

  const handleModuleOptionToggle = (userId: string, moduleKey: ModuleKey, optionKey: string, enabled: boolean) => {
    const targetUser = visibleUsers.find(u => u.id === userId);
    if (!targetUser) return;
    
    const currentModules = modifiedUsers[userId]?.enabled_modules ?? targetUser.enabled_modules ?? {};
    const moduleState = currentModules[moduleKey];
    
    let newModuleState: ModuleOptionsState;
    if (typeof moduleState === 'object') {
      newModuleState = { ...moduleState, options: { ...(moduleState.options || {}), [optionKey]: enabled } };
    } else {
      newModuleState = { enabled: !!moduleState, options: { [optionKey]: enabled } };
    }
    
    setModifiedUsers(prev => ({
      ...prev,
      [userId]: { ...prev[userId], enabled_modules: { ...currentModules, [moduleKey]: newModuleState } },
    }));
  };

  return {
    // Data
    users: visibleUsers,
    paginatedUsers,
    filteredUsers,
    agencies,
    usersLoading,
    modifiedUsers,
    
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    PAGE_SIZE,
    
    // Filters
    searchQuery,
    setSearchQuery,
    agencyFilter,
    setAgencyFilter,
    roleFilter,
    setRoleFilter,
    moduleFilter,
    setModuleFilter,
    showDeactivated,
    setShowDeactivated,
    
    // Permissions
    canAccessPage,
    canCreateUsers,
    canDeleteUsers,
    assignableRoles,
    isSuperAdmin,
    effectiveUserRole,
    currentUserLevel,
    currentUserAgency,
    canEditUser,
    canDeactivateUserCheck,
    canDeleteUser,
    isModuleEnabledForUser,
    
    // Mutations
    saveMutation,
    createUserMutation,
    deactivateMutation,
    reactivateMutation,
    hardDeleteMutation,
    updateUserMutation,
    updateEmailMutation,
    resetPasswordMutation,
    
    // Handlers
    saveChanges,
    handleRoleChange,
    handleModuleToggle,
    handleModuleOptionToggle,
  };
}
