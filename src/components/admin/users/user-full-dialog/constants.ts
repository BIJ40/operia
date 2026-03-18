/**
 * Constants and types for UserFullDialog
 * Extracted for clarity — no behavioral change.
 */

import { ModuleKey } from '@/types/modules';
import { SitemapSection } from '@/config/sitemapData';
import { GlobalRole } from '@/types/globalRoles';

// Postes disponibles (N1 supprimé - technicien legacy conservé pour édition)
export const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

export const SPECIAL_ACCESS_KEYS: { moduleKey: ModuleKey; optionKey?: string; label: string }[] = [
  { moduleKey: 'ticketing', label: 'Gestion de Projet' },
  { moduleKey: 'support.aide_en_ligne', optionKey: 'agent', label: 'Agent Support' },
  { moduleKey: 'support.guides', optionKey: 'edition', label: 'Contributeur FAQ' },
];

export const VISIBLE_SECTIONS: SitemapSection[] = ['core', 'academy', 'pilotage', 'rh', 'support', 'reseau', 'projects', 'admin'];

export interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

export interface UserFullDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  globalRole: GlobalRole | null;
  agencyId?: string | null;
  agencySlug?: string | null;
  agencyLabel?: string | null;
  roleAgence?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  apogeeUserId?: number | null;
  enabledModules: import('@/types/modules').EnabledModules | null;
  planKey?: string | null;
  planLabel?: string | null;
  canEdit?: boolean;
  pageOverrides?: string[];
  agencies?: Agency[];
  assignableRoles?: GlobalRole[];
  onPlanChange?: (newPlanKey: string) => void;
  onModuleToggle?: (moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => void;
  onPageOverrideToggle?: (pagePath: string, enabled: boolean) => void;
  onSaveUser?: (data: {
    first_name: string;
    last_name: string;
    email: string;
    agence: string;
    agency_id: string | null;
    role_agence: string;
    global_role: GlobalRole;
    apogee_user_id: number | null;
  }) => void;
  onUpdateEmail?: (newEmail: string) => void;
  onResetPassword?: (newPassword: string, sendEmail: boolean) => void;
  isSaving?: boolean;
  isEmailPending?: boolean;
  isPasswordPending?: boolean;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  agence: string;
  roleAgence: string;
  globalRole: GlobalRole;
  apogeeUserId: number | undefined;
}
