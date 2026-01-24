/**
 * Phase 2/3 - Labels de rôles visibles pour l'UX
 * Masque les codes techniques N0-N6 au profit de libellés métier clairs
 */

import { GlobalRole } from '@/types/globalRoles';

/**
 * Labels simplifiés pour l'affichage utilisateur
 * Les codes N0-N6 sont masqués au profit de termes métier
 */
export const VISIBLE_ROLE_LABELS: Record<GlobalRole, string> = {
  base_user: 'Visiteur',
  franchisee_user: 'Collaborateur agence',
  franchisee_admin: 'Dirigeant agence',
  franchisor_user: 'Animateur réseau',
  franchisor_admin: 'Direction réseau',
  platform_admin: 'Support avancé',
  superadmin: 'Administrateur',
};

/**
 * Descriptions courtes pour chaque rôle
 */
export const VISIBLE_ROLE_DESCRIPTIONS: Record<GlobalRole, string> = {
  base_user: 'Accès limité en consultation',
  franchisee_user: 'Accès aux outils de l\'agence',
  franchisee_admin: 'Gestion complète de l\'agence',
  franchisor_user: 'Vue multi-agences du réseau',
  franchisor_admin: 'Pilotage complet du réseau',
  platform_admin: 'Administration plateforme',
  superadmin: 'Accès total',
};

/**
 * Badges de couleur épurés (sans les codes N)
 */
export const VISIBLE_ROLE_COLORS: Record<GlobalRole, string> = {
  base_user: 'bg-slate-100 text-slate-700',
  franchisee_user: 'bg-sky-100 text-sky-700',
  franchisee_admin: 'bg-blue-100 text-blue-700',
  franchisor_user: 'bg-violet-100 text-violet-700',
  franchisor_admin: 'bg-purple-100 text-purple-700',
  platform_admin: 'bg-amber-100 text-amber-700',
  superadmin: 'bg-rose-100 text-rose-700',
};

/**
 * Retourne le label visible d'un rôle
 */
export function getVisibleRoleLabel(role: GlobalRole | null): string {
  if (!role) return 'Non défini';
  return VISIBLE_ROLE_LABELS[role] || role;
}

/**
 * Retourne la couleur CSS d'un rôle
 */
export function getVisibleRoleColor(role: GlobalRole | null): string {
  if (!role) return 'bg-muted text-muted-foreground';
  return VISIBLE_ROLE_COLORS[role] || 'bg-muted text-muted-foreground';
}
