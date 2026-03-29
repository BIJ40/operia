import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { useProfile } from '@/contexts/ProfileContext';
import { GlobalRole, getRoleLevel } from '@/types/globalRoles';
import { 
  getUserManagementCapabilities, 
  canViewUser, 
  canManageUser, 
  canDeactivateUser as canDeactivateUserHelper,
  UserViewScope,
  UserManagementCapabilities 
} from '@/config/roleMatrix';
import { EnabledModules, ModuleOptionsState, ModuleKey, MODULE_DEFINITIONS } from '@/types/modules';
import { logAuth } from '@/lib/logger';
import { toast } from 'sonner';
import { useAdminAgencies } from './use-admin-agencies';
import { enabledModulesToRows, userModulesToEnabledModules } from '@/lib/userModulesUtils';
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';

// ✅ SYNCHRONISATION COMPLÈTE: fonction centralisée pour invalider TOUTES les query keys utilisateurs
function invalidateAllUserQueries(queryClient: ReturnType<typeof useQueryClient>) {
  ALL_USER_QUERY_PATTERNS.forEach(pattern => {
    queryClient.invalidateQueries({ queryKey: [pattern] });
  });
  // Invalider aussi les queries préfixées (agency-users avec slug, user-profile avec id)
  queryClient.invalidateQueries({ predicate: (query) => 
    query.queryKey[0] === 'agency-users' || 
    query.queryKey[0] === 'user-profile'
  });
}

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  agency_id: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
  role_agence: string | null;
  created_at: string;
  is_active: boolean | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  must_change_password: boolean | null;
  apogee_user_id: number | null;
  agencyLabel?: string | null;
}

const PAGE_SIZE = 20;

// ============================================================================
// Types pour le hook unifié
// ============================================================================

type HookScopeOption = 'ownAgency' | 'assignedAgencies' | 'allAgencies';

interface UseUserManagementOptions {
  scope?: HookScopeOption;
  restrictToAgencyId?: string | null;
}

// ============================================================================
// Helper: Calcul du scope effectif (min entre scope demandé et capabilities)
// ============================================================================

/**
 * Retourne le scope effectif = min(scopeProp, capabilities.viewScope)
 * Garantit qu'on ne peut jamais voir plus que ce que nos capabilities autorisent
 */
function getRestrictedScope(
  requestedScope: HookScopeOption,
  capabilities: UserManagementCapabilities
): UserViewScope {
  const scopeOrder: UserViewScope[] = [
    'none',
    'self',
    'ownAgency',
    'assignedAgencies',
    'allAgencies',
  ];
  
  const requestedIndex = scopeOrder.indexOf(requestedScope);
  const capabilitiesIndex = scopeOrder.indexOf(capabilities.viewScope);
  
  // Retourner le scope le plus restrictif
  return scopeOrder[Math.min(requestedIndex, capabilitiesIndex)];
}

// ============================================================================
// Hook principal
// ============================================================================

export function useUserManagement(options: UseUserManagementOptions = {}) {
  const { scope = 'allAgencies', restrictToAgencyId } = options;
  const queryClient = useQueryClient();
  const { globalRole, suggestedGlobalRole, isAdmin } = usePermissions();
  const { user } = useAuthCore();
  const { agence: currentUserAgency, agencyId: currentUserAgencyId } = useProfile();
  
  // ✅ SOURCE DE VÉRITÉ : Permissions depuis roleMatrix.ts
  const effectiveUserRole = globalRole ?? suggestedGlobalRole;
  const currentUserLevel = getRoleLevel(effectiveUserRole);
  const capabilities = useMemo(
    () => getUserManagementCapabilities(effectiveUserRole),
    [effectiveUserRole]
  );
  
  const canAccessPage = capabilities.viewScope !== 'none' || isAdmin;
  const canCreateUsers = capabilities.canCreateRoles.length > 0;
  const canDeleteUsers = capabilities.canDeleteUsers;
  // Utilise directement capabilities.canCreateRoles (source de vérité: permissionsEngine.ts)
  const assignableRoles = useMemo(() => capabilities.canCreateRoles, [capabilities.canCreateRoles]);
  const isSuperAdmin = effectiveUserRole === 'superadmin';

  // ✅ Calcul du scope effectif (croise scope demandé avec capabilities)
  const effectiveScope = useMemo(
    () => getRestrictedScope(scope, capabilities),
    [scope, capabilities]
  );

  // Permission checks
  const canEditUser = (targetRole: GlobalRole | null, targetAgency: string | null, targetUserId?: string): boolean => {
    // ✅ EXCEPTION N6: superadmin peut s'auto-éditer
    if (isSuperAdmin && targetUserId && user?.id === targetUserId) {
      return true;
    }
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


  // ✅ Calcul de manageableAgencyIds (liste des agences visibles/gérables)
  const manageableAgencyIds = useMemo<string[] | null>(() => {
    // Si restrictToAgencyId fourni (ex: /equipe), forcer ce scope
    if (restrictToAgencyId) return [restrictToAgencyId];
    
    switch (effectiveScope) {
      case 'none':
      case 'self':
        return []; // Pas de gestion d'autres utilisateurs
      case 'ownAgency':
        return currentUserAgencyId ? [currentUserAgencyId] : [];
      case 'assignedAgencies':
      case 'allAgencies':
        return null;
      case 'allAgencies':
        return null; // null = pas de filtre agence
      default:
        return [];
    }
  }, [effectiveScope, restrictToAgencyId, currentUserAgencyId]);

  // ✅ Fetch users avec sélection explicite de colonnes + modules depuis user_modules
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['user-management', manageableAgencyIds, showDeactivated],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          agence,
          agency_id,
          global_role, 
          role_agence, 
          is_active, 
          created_at,
          deactivated_at,
          deactivated_by,
          must_change_password,
          apogee_user_id
        `);
      
      // Filtre agences — agency_id est la source unique de vérité
      if (manageableAgencyIds !== null) {
        query = query.in('agency_id', manageableAgencyIds);
      }
      
      // Filtre statut
      if (!showDeactivated) {
        query = query.eq('is_active', true);
      }
      
      const { data: profilesData, error: profilesError } = await query.order('created_at', { ascending: false });
      if (profilesError) throw profilesError;
      
      // ✅ Fetch user_modules pour tous les users (SOURCE DE VÉRITÉ pour les modules)
      const userIds = profilesData?.map(p => p.id) ?? [];
      const { data: modulesData } = await supabase
        .from('user_modules')
        .select('user_id, module_key, options')
        .in('user_id', userIds);
      
      // Group modules by user_id
      const modulesByUser = new Map<string, { module_key: string; options: unknown }[]>();
      modulesData?.forEach(row => {
        const existing = modulesByUser.get(row.user_id) || [];
        existing.push({ module_key: row.module_key, options: row.options });
        modulesByUser.set(row.user_id, existing);
      });
      
      // Enrichir les utilisateurs avec les modules de user_modules table
      // ✅ Exclure explicitement le JSONB legacy pour éviter toute pollution
      const enrichedUsers = profilesData?.map(profile => {
        const userModules = modulesByUser.get(profile.id);
        const enabled_modules = userModulesToEnabledModules(userModules ?? []);
        // Supprimer le champ legacy enabled_modules du profil avant merge
        // Cast nécessaire : le select() ne renvoie pas enabled_modules mais le type Row l'inclut
        const { enabled_modules: _legacyIgnored, ...cleanProfile } = profile as Record<string, unknown>;
        return { ...cleanProfile, enabled_modules };
      }) ?? [];
      
      return enrichedUsers as UserProfile[];
    },
    enabled: effectiveScope !== 'none' && effectiveScope !== 'self',
  });

  // ✅ Filter users based on viewScope (utilise canViewUser avec assignedAgencies)
  const visibleUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(u => {
      if (capabilities.viewScope === 'self') {
        return u.id === user?.id;
      }
      return canViewUser(effectiveUserRole, currentUserAgency, u.agence);
    });
  }, [users, capabilities, effectiveUserRole, currentUserAgency, user?.id]);

  // Fetch agencies from apogee_agencies table
  const { data: agencies = [] } = useAdminAgencies();

  // Compute manageable agencies for UI filters
  const manageableAgencies = useMemo(() => {
    if (manageableAgencyIds === null) return agencies; // All agencies
    return agencies.filter(a => manageableAgencyIds.includes(a.id));
  }, [agencies, manageableAgencyIds]);

  // Module check helper
  const isModuleEnabledForUser = (modules: EnabledModules, moduleKey: string): boolean => {
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
        const userAgencyId = user.agency_id;
        const userAgenceSlug = user.agence;
        if (agencyFilter === 'none' && (userAgencyId || userAgenceSlug)) return false;
        if (agencyFilter !== 'none' && userAgenceSlug !== agencyFilter) return false;
      }
      
      if (roleFilter !== 'all') {
        const effectiveRole = modifiedUsers[user.id]?.global_role ?? user.global_role;
        if (effectiveRole !== roleFilter) return false;
      }

      if (moduleFilter !== 'all') {
        const effectiveModules = modifiedUsers[user.id]?.enabled_modules ?? user.enabled_modules ?? {};
        if (!isModuleEnabledForUser(effectiveModules, moduleFilter)) return false;
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

  // ============================================================================
  // Mutations avec vérifications de permissions
  // ============================================================================

  const saveMutation = useMutation({
    mutationFn: async ({ userId, globalRole, enabledModules }: { 
      userId: string; 
      globalRole: GlobalRole | null; 
      enabledModules: EnabledModules | null;
    }) => {
      // ✅ VÉRIFICATION CRITIQUE : Le rôle cible est-il éditable ?
      if (globalRole && !capabilities.canEditRoles.includes(globalRole)) {
        throw new Error('Vous ne pouvez pas attribuer ce rôle');
      }
      
      // 1. Mise à jour du profil (global_role uniquement - JSONB supprimé P3.2)
      const { error } = await supabase
        .from('profiles')
        .update({ global_role: globalRole })
        .eq('id', userId);
      if (error) throw error;
      
      // 2. Écriture UNIQUE vers user_modules table (source de vérité P3.2)
      // Supprimer les anciens modules
      await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId);
      
      // Insérer les nouveaux modules via utilitaire centralisé
      if (enabledModules) {
        const moduleRows = enabledModulesToRows(userId, enabledModules, user?.id);
        
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
      setModifiedUsers(prev => { const next = { ...prev }; delete next[userId]; return next; });
      invalidateAllUserQueries(queryClient);
    },
    onError: (error) => {
      logAuth.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

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
      collaboratorId?: string;
      username?: string;
    }) => {
      // Le rôle global est celui choisi par l'admin, pas de forçage automatique
      const effectiveGlobalRole = userData.globalRole;
      
      // ✅ VÉRIFICATION CRITIQUE : Le rôle cible est-il créable ?
      if (!capabilities.canCreateRoles.includes(effectiveGlobalRole)) {
        throw new Error('Vous ne pouvez pas créer un utilisateur avec ce rôle');
      }
      
      const { collaboratorId, username, ...rest } = userData;
      const body: Record<string, unknown> = { ...rest, globalRole: effectiveGlobalRole };
      if (collaboratorId) {
        body.collaborator_id = collaboratorId;
      }
      if (username) {
        body.username = username;
      }
      
      const { data, error } = await supabase.functions.invoke('create-user', { body });
      // Check body error first (contains the explicit message from edge function)
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      invalidateAllUserQueries(queryClient);
      // Invalider aussi les queries collaborateurs pour refresh du bouton
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      // ✅ VÉRIFICATION : Peut-on désactiver ce rôle ?
      if (!capabilities.canDeactivateRoles.includes(targetUser.global_role!)) {
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
      logAuth.info(`[USER_MGMT] Utilisateur désactivé: ${targetUser.email}`);
      toast.success(`${targetUser.email || 'Utilisateur'} a été désactivé`);
      invalidateAllUserQueries(queryClient);
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
      invalidateAllUserQueries(queryClient);
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (targetUser: UserProfile) => {
      // ✅ VÉRIFICATION : Seuls N5+ peuvent hard delete
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
      invalidateAllUserQueries(queryClient);
    },
    onError: (error: Error) => toast.error(`Erreur suppression: ${error.message}`),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { 
      userId: string; 
      data: { 
        first_name?: string; 
        last_name?: string; 
        agence?: string; 
        agency_id?: string | null;
        role_agence?: string; 
        global_role?: GlobalRole;
        apogee_user_id?: number | null;
      } 
    }) => {
      // Le rôle global est celui choisi par l'admin, pas de forçage automatique
      const effectiveGlobalRole = data.global_role;
      
      // ✅ VÉRIFICATION : Si changement de rôle, est-il autorisé ?
      if (effectiveGlobalRole && !capabilities.canEditRoles.includes(effectiveGlobalRole)) {
        throw new Error('Vous ne pouvez pas attribuer ce rôle');
      }
      
      const updateData: Record<string, unknown> = {
        first_name: data.first_name,
        last_name: data.last_name,
        agence: data.agence,
        agency_id: data.agency_id ?? null,
        role_agence: data.role_agence,
        global_role: effectiveGlobalRole,
        apogee_user_id: data.apogee_user_id,
      };
      
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;
      return userId;
    },
    onSuccess: () => {
      toast.success('Informations mises à jour');
      invalidateAllUserQueries(queryClient);
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
      invalidateAllUserQueries(queryClient);
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword, sendEmail = true }: { userId: string; newPassword: string; sendEmail?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', { body: { targetUserId: userId, newPassword, sendEmail } });
      
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
      return data;
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
      invalidateAllUserQueries(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================================================
  // Handlers
  // ============================================================================

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
    // Auto-save immédiatement : persister le rôle sans attendre un clic "Enregistrer"
    const targetUser = visibleUsers.find(u => u.id === userId);
    if (targetUser) {
      const existingChanges = modifiedUsers[userId];
      saveMutation.mutate({
        userId,
        globalRole: role,
        enabledModules: existingChanges?.enabled_modules ?? targetUser.enabled_modules,
      });
    }
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

  // ============================================================================
  // Return object
  // ============================================================================

  return {
    // Data
    users: visibleUsers,
    paginatedUsers,
    filteredUsers,
    agencies,
    manageableAgencies,
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
    
    // Permissions (calculées depuis roleMatrix.ts - pas configurables)
    canAccessPage,
    canCreateUsers,
    canDeleteUsers,
    assignableRoles,
    isSuperAdmin,
    effectiveUserRole,
    currentUserLevel,
    currentUserAgency,
    capabilities,
    effectiveScope,
    manageableAgencyIds,
    
    // Permission checks (fonctions helper)
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
