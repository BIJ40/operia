/**
 * Gestion des utilisateurs support
 * Source de vérité: table user_modules (pas profiles.enabled_modules)
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { SupportUser } from './types';

export function useSupportUsers() {
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);

  const deriveFranchiseurRole = (globalRole: string | null): string => {
    if (!globalRole) return 'animateur';
    if (globalRole === 'superadmin' || globalRole === 'platform_admin') return 'dg';
    if (globalRole === 'franchisor_admin') return 'directeur';
    return 'animateur';
  };

  const loadSupportUsers = useCallback(async () => {
    try {
      // 1. Fetch users who have the 'aide' module with agent option from user_modules
      const { data: agentModules, error: modulesError } = await supabase
        .from('user_modules')
        .select('user_id, options')
        .in('module_key', ['aide', 'support.aide_en_ligne']);
      
      if (modulesError) {
        logError('[ADMIN-TICKETS] Error loading support modules', modulesError);
        setSupportUsers([]);
        return;
      }

      // Filter to only agent or admin users
      const supportUserIds = (agentModules || [])
        .filter(m => {
          const opts = m.options as Record<string, boolean> | null;
          return opts?.agent === true || opts?.admin === true;
        })
        .map(m => m.user_id);

      if (supportUserIds.length === 0) {
        setSupportUsers([]);
        return;
      }

      // 2. Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, global_role')
        .in('id', supportUserIds)
        .eq('is_active', true);

      if (profilesError) {
        logError('[ADMIN-TICKETS] Error loading support profiles', profilesError);
        setSupportUsers([]);
        return;
      }

      // Merge derived franchiseur_role into profiles
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        franchiseur_role: deriveFranchiseurRole(profile.global_role)
      }));

      setSupportUsers(usersWithRoles as SupportUser[]);
    } catch (err) {
      logError('[ADMIN-TICKETS] Unexpected error loading support users', err);
      setSupportUsers([]);
    }
  }, []);

  return {
    supportUsers,
    loadSupportUsers,
    deriveFranchiseurRole,
  };
}
