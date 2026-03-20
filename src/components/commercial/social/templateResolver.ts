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
 * Mapping des 8 topic_types vers les 5 templates canvas existants.
 */
export function resolveSocialTemplate(input: TemplateResolverInput): SocialTemplateId {
  const { topic_type, hasMedia } = input;

  // Preuve avec vraie photo → realisation_card
  if (topic_type === 'preuve' && hasMedia) {
    return 'realisation_card';
  }

  // Mapping topic_type → template canvas
  const TEMPLATE_MAP: Record<string, SocialTemplateId> = {
    urgence: 'tip_card',
    prevention: 'awareness_card',
    amelioration: 'brand_card',
    conseil: 'tip_card',
    preuve: 'brand_card', // fallback sans photo
    saisonnier: 'awareness_card',
    contre_exemple: 'tip_card',
    pedagogique: 'educational_card',
    prospection: 'brand_card',
    // Legacy types (backward compatibility)
    awareness_day: 'awareness_card',
    seasonal_tip: 'tip_card',
    realisation: hasMedia ? 'realisation_card' : 'brand_card',
    local_branding: 'brand_card',
    educational: 'educational_card',
  };

  return TEMPLATE_MAP[topic_type] || 'brand_card';
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
