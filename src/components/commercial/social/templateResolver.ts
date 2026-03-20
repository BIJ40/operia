/**
 * templateResolver — Sélection automatique du template visuel social
 * selon le contexte de la suggestion.
 *
 * RÈGLE CRITIQUE :
 * - realisation_card UNIQUEMENT si une vraie photo APRÈS existe (hasMedia=true).
 * - Un post "réalisation" SANS photo réelle → fallback brand_card avec texte générique.
 * - JAMAIS de photo IA pour illustrer de faux travaux.
 */

export type SocialTemplateId = 'realisation_card' | 'tip_card' | 'awareness_card' | 'brand_card' | 'educational_card';

export interface TemplateResolverInput {
  topic_type: string;
  hasMedia?: boolean;
  hasRealisation?: boolean;
  universe?: string | null;
  platform?: string | null;
}

/**
 * Détermine le template visuel à utiliser selon le contexte.
 *
 * realisation_card requiert OBLIGATOIREMENT une vraie photo (hasMedia).
 * Sans photo réelle, un sujet "réalisation" tombe en brand_card générique.
 */
export function resolveSocialTemplate(input: TemplateResolverInput): SocialTemplateId {
  const { topic_type, hasMedia } = input;

  // 1. Réalisation — UNIQUEMENT avec une vraie photo APRÈS
  if (topic_type === 'realisation' && hasMedia) {
    return 'realisation_card';
  }

  // 2. Conseil saisonnier
  if (topic_type === 'seasonal_tip') {
    return 'tip_card';
  }

  // 3. Journée de sensibilisation
  if (topic_type === 'awareness_day') {
    return 'awareness_card';
  }

  // 4. Contenu pédagogique (schéma / chiffres)
  if (topic_type === 'educational') {
    return 'educational_card';
  }

  // 5. Branding local, ou fallback pour réalisation sans photo
  return 'brand_card';
}

/**
 * Vérifie si un texte est autorisé pour un post sans photo réelle.
 * Interdit les mentions de travaux spécifiques / réalisations inventées.
 */
export const REALISATION_FORBIDDEN_WITHOUT_MEDIA = [
  'notre intervention',
  'nos travaux',
  'notre réalisation',
  'avant/après',
  'avant / après',
  'chantier terminé',
  'mission accomplie',
  'résultat final',
  'travaux réalisés',
  'nous avons réalisé',
  'nous avons installé',
  'nous avons remplacé',
  'nous avons réparé',
];

/**
 * Nettoie un texte de post pour supprimer les mentions de fausses réalisations
 * lorsqu'aucune photo réelle n'est disponible.
 * Retourne true si le texte a été jugé problématique (devrait être remplacé par du générique).
 */
export function isTextClaimingRealisation(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return REALISATION_FORBIDDEN_WITHOUT_MEDIA.some(phrase => lower.includes(phrase));
}
