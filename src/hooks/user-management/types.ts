/**
 * Types pour la gestion utilisateurs
 */
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules } from '@/types/modules';

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

export type HookScopeOption = 'ownAgency' | 'assignedAgencies' | 'allAgencies';

export interface UseUserManagementOptions {
  scope?: HookScopeOption;
  restrictToAgencyId?: string | null;
}

export interface ModifiedUserData {
  global_role?: GlobalRole | null;
  enabled_modules?: EnabledModules | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agence: string;
  roleAgence: string;
  globalRole: GlobalRole;
  sendEmail: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  agence?: string;
  role_agence?: string;
  support_level?: number;
  global_role?: GlobalRole;
  apogee_user_id?: number | null;
}

export const PAGE_SIZE = 20;
