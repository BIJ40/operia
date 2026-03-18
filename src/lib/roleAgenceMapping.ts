/**
 * MAPPING CENTRALISÉ : role_agence (poste occupé) → global_role suggéré
 * 
 * SOURCE DE VÉRITÉ pour la cohérence poste/rôle.
 * Utilisé dans les formulaires d'édition utilisateur pour auto-suggérer
 * le global_role approprié quand le poste change.
 */

import { GlobalRole } from '@/types/globalRoles';

/**
 * Mapping poste occupé → rôle global minimum cohérent.
 * 
 * Règles métier :
 * - dirigeant → franchisee_admin (N2) — dirige une agence
 * - tete_de_reseau → franchisor_user (N3) — rôle réseau
 * - assistante, commercial, technicien → franchisee_user (N1) — employé agence
 * - externe → base_user (N0) — partenaire extérieur
 */
export const ROLE_AGENCE_TO_GLOBAL_ROLE: Record<string, GlobalRole> = {
  dirigeant: 'franchisee_admin',
  tete_de_reseau: 'franchisor_user',
  assistante: 'franchisee_user',
  commercial: 'franchisee_user',
  technicien: 'franchisee_user',
  externe: 'base_user',
};

/**
 * Retourne le global_role cohérent pour un poste donné.
 * Retourne null si aucun mapping connu.
 */
export function getSuggestedGlobalRole(roleAgence: string | null): GlobalRole | null {
  if (!roleAgence) return null;
  return ROLE_AGENCE_TO_GLOBAL_ROLE[roleAgence.toLowerCase()] ?? null;
}

/**
 * Vérifie si un combo role_agence / global_role / agence est cohérent.
 * Retourne un message d'avertissement si incohérent, null sinon.
 */
export function validateRoleAgenceCoherence(
  roleAgence: string | null,
  globalRole: GlobalRole | null,
  agence: string | null
): string | null {
  // Règle 1: franchisee_admin/franchisee_user sans agence
  if (!agence && globalRole && ['franchisee_admin', 'franchisee_user'].includes(globalRole)) {
    return `Le rôle "${globalRole === 'franchisee_admin' ? 'Dirigeant agence' : 'Utilisateur agence'}" nécessite une agence rattachée.`;
  }

  // Règle 2: tete_de_reseau doit être N3+
  if (roleAgence === 'tete_de_reseau' && globalRole && !['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole)) {
    return `Le poste "Tête de réseau" nécessite un rôle franchiseur (N3+).`;
  }

  return null;
}

/**
 * Postes qui nécessitent obligatoirement une agence.
 */
export const AGENCY_REQUIRED_POSTES = ['dirigeant', 'assistante', 'commercial', 'technicien'];

/**
 * Postes compatibles avec l'absence d'agence.
 */
export const NO_AGENCY_POSTES = ['tete_de_reseau', 'externe'];
