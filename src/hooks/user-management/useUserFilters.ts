/**
 * Hook pour la gestion des filtres utilisateurs
 */
import { useState, useMemo } from 'react';
import { UserProfile, ModifiedUserData } from './types';
import { EnabledModules, ModuleKey } from '@/types/modules';

interface UseUserFiltersOptions {
  users: UserProfile[];
  modifiedUsers: Record<string, ModifiedUserData>;
  showDeactivated: boolean;
}

export function useUserFilters({ users, modifiedUsers, showDeactivated }: UseUserFiltersOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const isModuleEnabledForUser = (modules: EnabledModules, moduleKey: ModuleKey): boolean => {
    const state = modules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return state.enabled;
    return false;
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
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
        // agency_id is the source of truth; agence slug used as fallback for display/search
        const userAgencyId = user.agency_id;
        const userAgenceSlug = user.agence;
        if (agencyFilter === 'none' && (userAgencyId || userAgenceSlug)) return false;
        if (agencyFilter !== 'none') {
          // agencyFilter is a slug - match against agence slug
          if (userAgenceSlug !== agencyFilter) return false;
        }
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
  }, [users, searchQuery, agencyFilter, roleFilter, moduleFilter, modifiedUsers, showDeactivated]);

  return {
    searchQuery,
    setSearchQuery,
    agencyFilter,
    setAgencyFilter,
    roleFilter,
    setRoleFilter,
    moduleFilter,
    setModuleFilter,
    filteredUsers,
  };
}
