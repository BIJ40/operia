/**
 * canReplyToApporteur — Règle métier V1
 * 
 * Qui peut répondre aux apporteurs dans le fil d'échanges ?
 * - N2 (franchisee_admin) → toujours
 * - N1 (franchisee_user / user / agency_user) → seulement si poste contient "assistante" ou "secretaire"
 * - Tous les autres → lecture seule
 * 
 * Source de vérité du poste : profiles.role_agence (exposé via AuthContext.roleAgence)
 */

export function canReplyToApporteur(
  globalRole: string | null,
  roleAgence: string | null
): boolean {
  if (globalRole === 'franchisee_admin') return true;

  const isAgencyUser =
    globalRole === 'franchisee_user' ||
    globalRole === 'user' ||
    globalRole === 'agency_user';

  if (isAgencyUser) {
    const poste = roleAgence?.toLowerCase() ?? '';
    return poste.includes('assistante') || poste.includes('secretaire');
  }

  return false;
}
