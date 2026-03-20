/**
 * BD Story — 34 CTA finaux
 */

import { CtaEntry } from '../types/bdStory.types';

export const CTA_ENTRIES: CtaEntry[] = [
  { text: 'Un souci ? On intervient.', mode: 'intervention' },
  { text: 'Besoin d\'aide rapide ? Appelez-nous.', mode: 'appel' },
  { text: 'HelpConfort répond présent.', mode: 'general' },
  { text: 'On s\'occupe de tout.', mode: 'general' },
  { text: 'Un pro, c\'est plus sûr.', mode: 'general' },
  { text: 'Réagissez avant que ça empire.', mode: 'intervention' },
  { text: 'Mieux vaut agir tôt.', mode: 'general' },
  { text: 'On sécurise, puis on répare.', mode: 'intervention' },
  { text: 'Besoin d\'un diagnostic clair ?', mode: 'devis' },
  { text: 'On vous accompagne.', mode: 'general' },
  { text: 'Votre confort, notre priorité.', mode: 'general' },
  { text: 'Intervention rapide et efficace.', mode: 'intervention' },
  { text: 'Un appel suffit.', mode: 'appel' },
  { text: 'Faites confiance à un pro.', mode: 'general' },
  { text: 'On trouve la solution.', mode: 'general' },
  { text: 'Un devis ? C\'est simple.', mode: 'devis' },
  { text: 'Problème réglé durablement.', mode: 'general' },
  { text: 'Votre tranquillité retrouvée.', mode: 'general' },
  { text: 'On agit vite, bien.', mode: 'intervention' },
  { text: 'Ne laissez pas traîner.', mode: 'general' },
  { text: 'On sécurise immédiatement.', mode: 'intervention' },
  { text: 'Un expert à vos côtés.', mode: 'general' },
  { text: 'Une solution adaptée.', mode: 'general' },
  { text: 'Appelez, on s\'occupe du reste.', mode: 'appel' },
  { text: 'Un souci réglé sans stress.', mode: 'general' },
  { text: 'On intervient chez vous.', mode: 'intervention' },
  { text: 'Rapide, propre, efficace.', mode: 'general' },
  { text: 'On remet en état.', mode: 'general' },
  { text: 'Votre maison entre de bonnes mains.', mode: 'general' },
  { text: 'Contactez HelpConfort.', mode: 'message' },
  { text: 'On vous dépanne rapidement.', mode: 'intervention' },
  { text: 'Un problème ? Une solution.', mode: 'general' },
  { text: 'Intervention maîtrisée.', mode: 'intervention' },
  { text: 'On vous simplifie la vie.', mode: 'general' },
];

/** Get CTA entries filtered by mode */
export function getCtasByMode(mode: string): CtaEntry[] {
  if (mode === 'general') return CTA_ENTRIES;
  return CTA_ENTRIES.filter(c => c.mode === mode || c.mode === 'general');
}
