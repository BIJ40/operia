// Types pour le nouveau système de permissions

export type ScopeArea = 
  | 'help_academy'
  | 'pilotage_agence'
  | 'pilotage_franchiseur'
  | 'support'
  | 'administration'
  | 'externes';

export type RoleCategory = 'franchise' | 'franchiseur' | 'externe';

export interface Role {
  id: string;
  slug: string;
  label: string;
  category: RoleCategory;
  description?: string;
  is_active: boolean;
}

export interface Scope {
  id: string;
  slug: string;
  label: string;
  area: ScopeArea;
  description?: string;
  default_level: number; // 0-3
  is_active: boolean;
  display_order: number;
}

export interface RolePermission {
  id: string;
  role_agence: string;
  scope_id: string;
  block_id?: string;
  level: number; // 0-3
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
}

export interface UserPermission {
  id: string;
  user_id: string;
  scope_id?: string;
  block_id?: string;
  level?: number; // 0-3
  can_view?: boolean;
  can_edit?: boolean;
  can_create?: boolean;
  can_delete?: boolean;
  deny: boolean;
}

export interface UserCapability {
  id: string;
  user_id: string;
  capability: string;
  is_active: boolean;
  granted_at: string;
  granted_by?: string;
  metadata?: Record<string, unknown>;
}

// Permission levels
export const PERMISSION_LEVELS = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  ADMIN: 3,
} as const;

// Capabilities disponibles
export const CAPABILITIES = {
  SUPPORT: 'support',
  CONTENT_EDITOR: 'content_editor',
  ANALYTICS_VIEWER: 'analytics_viewer',
} as const;

export type CapabilityType = typeof CAPABILITIES[keyof typeof CAPABILITIES];

// Résultat du calcul des permissions effectives
export interface EffectivePermission {
  level: number;
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  source: 'default' | 'role' | 'user_override' | 'denied';
}

// Scopes prédéfinis (slugs)
export const SCOPE_SLUGS = {
  // Help Academy
  APOGEE: 'apogee',
  APPORTEURS: 'apporteurs',
  HELPCONFORT: 'helpconfort',
  DOCUMENTS: 'documents',
  // Pilotage Agence
  MES_INDICATEURS: 'mes_indicateurs',
  ACTIONS_A_MENER: 'actions_a_mener',
  DIFFUSION: 'diffusion',
  // Support
  MES_DEMANDES: 'mes_demandes',
  SUPPORT_TICKETS: 'support_tickets',
  // Franchiseur
  FRANCHISEUR_DASHBOARD: 'franchiseur_dashboard',
  FRANCHISEUR_KPI: 'franchiseur_kpi',
  FRANCHISEUR_AGENCIES: 'franchiseur_agencies',
  FRANCHISEUR_ROYALTIES: 'franchiseur_royalties',
  // Administration
  ADMIN_USERS: 'admin_users',
  ADMIN_ROLES: 'admin_roles',
  ADMIN_BACKUP: 'admin_backup',
  ADMIN_SETTINGS: 'admin_settings',
} as const;

export type ScopeSlug = typeof SCOPE_SLUGS[keyof typeof SCOPE_SLUGS];
