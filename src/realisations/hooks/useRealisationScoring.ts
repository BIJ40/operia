/**
 * Quality & SEO scoring logic
 */
import type { Realisation, RealisationMedia } from '../types';

interface ScoringResult {
  score: number;
  details: { label: string; points: number; maxPoints: number; met: boolean }[];
}

export function computeQualityScore(r: Realisation, media: RealisationMedia[]): ScoringResult {
  const details: ScoringResult['details'] = [];
  const check = (label: string, condition: boolean, pts: number) => {
    details.push({ label, points: condition ? pts : 0, maxPoints: pts, met: condition });
  };

  const hasBefore = media.some(m => m.media_role === 'before');
  const hasAfter = media.some(m => m.media_role === 'after');

  check('Photo avant', hasBefore, 15);
  check('Photo après', hasAfter, 15);
  check('Au moins 3 médias', media.length >= 3, 10);
  check('Au moins 5 médias', media.length >= 5, 5);
  check('Ville renseignée', !!r.city, 10);
  check('Service renseigné', !!r.service_family, 10);
  check('Description renseignée', !!r.description && r.description.length > 30, 10);
  check('Consentement publication', r.publication_consent, 10);
  check('Couverture choisie', !!r.cover_media_id, 5);
  check('Type de client', !!r.client_type, 5);
  check('Technicien renseigné', !!r.technician_name, 5);

  const score = details.reduce((sum, d) => sum + d.points, 0);
  return { score, details };
}

export function computeSeoScore(r: Realisation, media: RealisationMedia[]): ScoringResult {
  const details: ScoringResult['details'] = [];
  const check = (label: string, condition: boolean, pts: number) => {
    details.push({ label, points: condition ? pts : 0, maxPoints: pts, met: condition });
  };

  const hasBefore = media.some(m => m.media_role === 'before');
  const hasAfter = media.some(m => m.media_role === 'after');
  const altTextsCount = media.filter(m => !!m.alt_text).length;
  const captionsCount = media.filter(m => !!m.caption).length;

  check('Ville SEO renseignée', !!r.seo_city || !!r.city, 12);
  check('Métier renseigné', !!r.service_family, 12);
  check('Angle d\'article', !!r.seo_article_angle, 10);
  check('Alt texts renseignés', media.length > 0 && altTextsCount >= media.length * 0.5, 10);
  check('Légendes renseignées', media.length > 0 && captionsCount >= media.length * 0.5, 8);
  check('Titre SEO suggéré', !!r.seo_suggested_title, 12);
  check('Meta description', !!r.seo_meta_description, 12);
  check('Slug SEO', !!r.seo_slug, 8);
  check('Avant/après exploitable', hasBefore && hasAfter, 10);
  check('Résumé court', !!r.short_summary, 6);

  const score = details.reduce((sum, d) => sum + d.points, 0);
  return { score, details };
}
