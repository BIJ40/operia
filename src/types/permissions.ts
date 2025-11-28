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
  default_level: number; // 0-4
  is_active: boolean;
  display_order: number;
}

export interface RolePermission {
  id: string;
  role_agence: string;
  scope_id: string;
  block_id?: string;
  level: number; // 0-4
  can_access?: boolean; // Ancien système
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
  level?: number; // 0-4
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

// Permission levels - 5 niveaux métiers
export const PERMISSION_LEVELS = {
  NONE: 0,      // Aucun - pas d'accès
  VIEW: 1,      // Lecture - consultation seule
  EDIT: 2,      // Écriture - peut créer/modifier son contenu
  MANAGE: 3,    // Gestion - peut gérer tout le contenu du scope
  ADMIN: 4,     // Admin - configuration et paramétrage du module
} as const;

// Labels pour affichage UI
export const PERMISSION_LEVEL_LABELS: Record<number, string> = {
  0: 'Aucun',
  1: 'Lecture',
  2: 'Écriture',
  3: 'Gestion',
  4: 'Admin',
};

// Couleurs pour affichage badges
export const PERMISSION_LEVEL_COLORS: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  4: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

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
  canView: boolean;    // level >= 1
  canEdit: boolean;    // level >= 2
  canCreate: boolean;  // level >= 2
  canDelete: boolean;  // level >= 3
  canAdmin: boolean;   // level >= 4
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

// Helper pour vérifier les niveaux requis
export function meetsLevel(effectiveLevel: number, requiredLevel: number): boolean {
  return effectiveLevel >= requiredLevel;
}
