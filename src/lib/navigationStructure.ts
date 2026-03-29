/**
 * Navigation Structure — Source de vérité pour la Vue A "Navigation / Accès visibles"
 *
 * Chaque domaine reflète un onglet principal de l'application.
 * Chaque entrée reflète un sous-onglet ou une section visible dans l'UI.
 * Les guards correspondent aux checks runtime réels (hasModule / hasModuleOption).
 *
 * Phase 9c — Alignement fiche utilisateur sur la navigation réelle.
 */

import { BarChart3, TrendingUp, Users, FolderOpen, LifeBuoy, ShieldCheck, Network } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GlobalRole } from '@/types/globalRoles';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export interface NavigationGuard {
  /** Module-only check: hasModule(moduleKey) */
  moduleKey?: string;
  /** Module+option check: hasModuleOption(moduleKey, optionKey) */
  optionKey?: string;
  /** Always visible (no guard) */
  alwaysVisible?: boolean;
  /** Role-gated: only visible for specific roles */
  minRoles?: GlobalRole[];
  /** If set, entry is only accessible when this module is deployed */
  deploymentKey?: string;
}

export interface NavigationEntry {
  label: string;
  guard: NavigationGuard;
}

export interface NavigationDomain {
  id: string;
  label: string;
  icon: LucideIcon;
  entries: NavigationEntry[];
  /** If set, the entire domain is only visible for these roles */
  roleGated?: GlobalRole[];
}

// ────────────────────────────────────────────────
// N5+ roles (admin bypass)
// ────────────────────────────────────────────────

export const ADMIN_ROLES: GlobalRole[] = ['platform_admin', 'superadmin'];
export const FRANCHISEUR_ROLES: GlobalRole[] = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'];

// ────────────────────────────────────────────────
// Navigation Structure
// ────────────────────────────────────────────────

export const NAVIGATION_STRUCTURE: NavigationDomain[] = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    icon: BarChart3,
    entries: [
      { label: 'Statistiques', guard: { moduleKey: 'pilotage.statistiques' } },
      { label: 'Performance', guard: { moduleKey: 'pilotage.agence' } },
      { label: 'Actions à mener', guard: { moduleKey: 'pilotage.agence' } },
      { label: 'Devis acceptés', guard: { moduleKey: 'pilotage.agence' } },
      { label: 'Incohérences', guard: { moduleKey: 'pilotage.agence' } },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: TrendingUp,
    entries: [
      { label: 'Suivi client', guard: { moduleKey: 'prospection', optionKey: 'dashboard' } },
      { label: 'Comparateur', guard: { moduleKey: 'prospection', optionKey: 'comparateur' } },
      { label: 'Veille', guard: { moduleKey: 'prospection', optionKey: 'veille' } },
      { label: 'Prospects', guard: { moduleKey: 'prospection', optionKey: 'prospects' } },
      { label: 'Réalisations', guard: { moduleKey: 'commercial.realisations' } },
    ],
  },
  {
    id: 'organisation',
    label: 'Organisation',
    icon: Users,
    entries: [
      { label: 'Salariés', guard: { moduleKey: 'organisation.salaries' } },
      { label: 'Plannings', guard: { moduleKey: 'organisation.plannings' } },
      { label: 'Réunions', guard: { moduleKey: 'organisation.reunions' } },
      { label: 'Parc', guard: { moduleKey: 'organisation.parc' } },
      { label: 'Documents légaux', guard: { moduleKey: 'pilotage.agence' } },
    ],
  },
  {
    id: 'relations',
    label: 'Relations',
    icon: Users,
    entries: [
      { label: 'Apporteurs', guard: { moduleKey: 'relations.apporteurs' } },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FolderOpen,
    entries: [
      { label: 'Médiathèque', guard: { moduleKey: 'mediatheque.documents' } },
      { label: 'Raccourcis', guard: { moduleKey: 'mediatheque.gerer' } },
      { label: 'Corbeille', guard: { moduleKey: 'mediatheque.gerer' } },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: LifeBuoy,
    entries: [
      { label: 'Aide en ligne', guard: { moduleKey: 'support.aide_en_ligne' } },
      { label: 'Guides', guard: { moduleKey: 'support.guides' } },
      { label: 'FAQ', guard: { alwaysVisible: true } },
      { label: 'Ticketing', guard: { alwaysVisible: true } },
    ],
  },
  {
    id: 'franchiseur',
    label: 'Franchiseur',
    icon: Network,
    roleGated: FRANCHISEUR_ROLES,
    entries: [
      { label: 'Accueil', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Période', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Agences', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Redevances', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Statistiques', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Divers', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Guides', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
      { label: 'Support', guard: { minRoles: FRANCHISEUR_ROLES, deploymentKey: 'reseau_franchiseur' } },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: ShieldCheck,
    roleGated: ADMIN_ROLES,
    entries: [
      // Gestion sub-tabs
      { label: 'Utilisateurs', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Inscriptions', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Apporteurs', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Audit Apporteurs', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Agences', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Droits', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Activité', guard: { minRoles: ADMIN_ROLES } },
      // Other pill tabs
      { label: 'Franchiseur', guard: { minRoles: ADMIN_ROLES } },
      { label: 'IA', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Contenu', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Ops', guard: { minRoles: ADMIN_ROLES } },
      { label: 'Plateforme', guard: { minRoles: ADMIN_ROLES } },
    ],
  },
];

// ────────────────────────────────────────────────
// Guard evaluator
// ────────────────────────────────────────────────

export function evaluateGuard(
  guard: NavigationGuard,
  effectiveModules: Record<string, { enabled?: boolean; options?: Record<string, boolean> }>,
  globalRole: GlobalRole | null,
  isAdminBypass: boolean,
  isDeployedModule?: (key: string) => boolean,
): boolean {
  // Deployment check — if deploymentKey is set and module is not deployed, block access
  if (guard.deploymentKey && isDeployedModule) {
    if (!isDeployedModule(guard.deploymentKey)) return false;
  }

  // Always visible entries
  if (guard.alwaysVisible) return true;

  // Role-gated entries
  if (guard.minRoles) {
    return !!globalRole && guard.minRoles.includes(globalRole);
  }

  // Admin bypass (N5+) → all module-gated entries are accessible
  if (isAdminBypass) return true;

  // Module + option check
  if (guard.moduleKey && guard.optionKey) {
    const mod = effectiveModules[guard.moduleKey];
    return mod?.enabled === true && mod?.options?.[guard.optionKey] === true;
  }

  // Module-only check
  if (guard.moduleKey) {
    return effectiveModules[guard.moduleKey]?.enabled === true;
  }

  return false;
}
