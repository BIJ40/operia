/**
 * Gestion des utilisateurs support
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/safeQuery';
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
    const profilesResult = await safeQuery<any[]>(
      supabase
        .from('profiles')
        .select('id, first_name, last_name, global_role, enabled_modules')
        .eq('is_active', true),
      'ADMIN_TICKETS_LOAD_PROFILES'
    );

    if (!profilesResult.success) {
      logError('[ADMIN-TICKETS] Error loading support users', profilesResult.error);
      setSupportUsers([]);
      return;
    }

    const profiles = profilesResult.data || [];
    if (profiles.length === 0) {
      setSupportUsers([]);
      return;
    }

    // Filtrer les profils qui ont accès support activé
    const supportProfiles = profiles.filter(p => {
      const modules = p.enabled_modules as any;
      if (!modules?.support?.enabled) return false;
      const options = modules.support.options || {};
      return options.agent === true || options.admin === true;
    });

    if (supportProfiles.length === 0) {
      setSupportUsers([]);
      return;
    }

    // Merge derived franchiseur_role into profiles
    const usersWithRoles = supportProfiles.map(profile => ({
      ...profile,
      franchiseur_role: deriveFranchiseurRole(profile.global_role)
    }));

    setSupportUsers(usersWithRoles as SupportUser[]);
  }, []);

  return {
    supportUsers,
    loadSupportUsers,
    deriveFranchiseurRole,
  };
}
