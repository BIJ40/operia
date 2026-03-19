/**
 * templateResolver — Sélection automatique du template visuel social
 * selon le contexte de la suggestion.
 */

export type SocialTemplateId = 'realisation_card' | 'tip_card' | 'awareness_card' | 'brand_card';

export interface TemplateResolverInput {
  topic_type: string;
  hasMedia?: boolean;
  hasRealisation?: boolean;
  universe?: string | null;
  platform?: string | null;
}

/**
 * Détermine le template visuel à utiliser selon le contexte.
 * Fallback robuste sur brand_card.
 */
export function resolveSocialTemplate(input: TemplateResolverInput): SocialTemplateId {
  const { topic_type, hasMedia, hasRealisation } = input;

  // 1. Réalisation avec média disponible
  if (topic_type === 'realisation' && (hasMedia || hasRealisation)) {
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

  // 4. Branding local ou fallback
  return 'brand_card';
}
