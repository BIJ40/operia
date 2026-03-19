/**
 * useSocialRealisationCandidates — Sélection intelligente de réalisations exploitables
 * pour le module Social Hub.
 * 
 * Scoring : media_quality × 0.35 + recency × 0.25 + universe_match × 0.20 + seasonal_fit × 0.10 + novelty × 0.10
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RealisationCandidate {
  id: string;
  title: string;
  agency_id: string;
  intervention_date: string;
  universe: string | null;
  media_count: number;
  has_before: boolean;
  has_after: boolean;
  score: number;
}

// ─── Universe inference from title keywords ──────────────────
const UNIVERSE_KEYWORDS: Record<string, string[]> = {
  plomberie: ['plomberie', 'plombier', 'fuite', 'canalisation', 'robinet', 'chauffe-eau', 'ballon', 'wc', 'sanitaire', 'tuyau', 'siphon', 'chasse d\'eau', 'cumulus', 'radiateur', 'chauffage', 'eau chaude'],
  electricite: ['électricité', 'electricite', 'électrique', 'electrique', 'prise', 'tableau', 'disjoncteur', 'câblage', 'cablage', 'interrupteur', 'éclairage', 'eclairage', 'luminaire', 'court-circuit'],
  serrurerie: ['serrurerie', 'serrurier', 'serrure', 'porte', 'blindage', 'clé', 'cle', 'verrou', 'cylindre', 'ouverture'],
  vitrerie: ['vitrerie', 'vitrier', 'vitre', 'vitrage', 'fenêtre', 'fenetre', 'double vitrage', 'carreau', 'baie vitrée'],
  menuiserie: ['menuiserie', 'menuisier', 'bois', 'parquet', 'porte intérieure', 'placard', 'agencement'],
  renovation: ['rénovation', 'renovation', 'travaux', 'salle de bain', 'cuisine', 'carrelage', 'peinture', 'aménagement', 'amenagement', 'sol', 'mur'],
  volets: ['volet', 'store', 'volet roulant', 'motorisation', 'persienne'],
  pmr: ['pmr', 'accessibilité', 'accessibilite', 'handicap', 'douche italienne', 'barre d\'appui', 'rampe'],
};

/**
 * Infer universe from realisation title using keyword matching.
 * Returns the best-matching universe or null.
 */
function inferUniverseFromTitle(title: string): string | null {
  const normalized = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [universe, keywords] of Object.entries(UNIVERSE_KEYWORDS)) {
    let matchCount = 0;
    for (const kw of keywords) {
      const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKw)) {
        matchCount++;
      }
    }
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = universe;
    }
  }

  return bestMatch;
}

// ─── Season → universe affinity ──────────────────────────────
const SEASON_UNIVERSE_MAP: Record<string, string[]> = {
  winter: ['plomberie', 'electricite', 'renovation'],
  spring: ['plomberie', 'vitrerie', 'menuiserie', 'renovation'],
  summer: ['plomberie', 'electricite', 'volets', 'serrurerie'],
  autumn: ['plomberie', 'electricite', 'renovation'],
};

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function computeScore(
  hasBeforeAfter: boolean,
  mediaCt: number,
  interventionDate: string,
  universe: string | null,
  recentlyUsedIds: Set<string>,
  realisationId: string,
): number {
  // media_quality (0-100)
  let mediaQuality = 0;
  if (hasBeforeAfter) mediaQuality = 100;
  else if (mediaCt > 0) mediaQuality = 40;

  // recency (0-100)
  const daysSince = Math.floor((Date.now() - new Date(interventionDate).getTime()) / 86_400_000);
  let recency = 25;
  if (daysSince < 30) recency = 100;
  else if (daysSince < 90) recency = 75;
  else if (daysSince < 180) recency = 50;

  // universe_match (0-100) — identified universe scores much higher
  const universeMatch = universe ? 100 : 30;

  // seasonal_fit (0-100)
  const season = getCurrentSeason();
  const seasonUniverses = SEASON_UNIVERSE_MAP[season] || [];
  const seasonalFit = universe && seasonUniverses.includes(universe) ? 100 : 50;

  // novelty (0-100) — not used in last 21 days
  const novelty = recentlyUsedIds.has(realisationId) ? 0 : 100;

  return (
    mediaQuality * 0.35 +
    recency * 0.25 +
    universeMatch * 0.20 +
    seasonalFit * 0.10 +
    novelty * 0.10
  );
}

export function useSocialRealisationCandidates(minScore = 50) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['social-realisation-candidates', agencyId],
    enabled: !!agencyId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RealisationCandidate[]> => {
      if (!agencyId) return [];

      // Fetch realisations with their media roles
      const { data: realisations, error: rErr } = await supabase
        .from('realisations')
        .select('id, title, agency_id, intervention_date')
        .eq('agency_id', agencyId)
        .order('intervention_date', { ascending: false })
        .limit(100);

      if (rErr || !realisations?.length) return [];

      const ids = realisations.map(r => r.id);

      const { data: media } = await supabase
        .from('realisation_media')
        .select('realisation_id, media_role')
        .in('realisation_id', ids);

      // Build media profile per realisation
      const mediaMap = new Map<string, { count: number; hasBefore: boolean; hasAfter: boolean }>();
      for (const m of media || []) {
        const entry = mediaMap.get(m.realisation_id) || { count: 0, hasBefore: false, hasAfter: false };
        entry.count++;
        if (m.media_role === 'before') entry.hasBefore = true;
        if (m.media_role === 'after') entry.hasAfter = true;
        mediaMap.set(m.realisation_id, entry);
      }

      // Get recently used realisation IDs (last 21 days)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 21);
      const { data: recent } = await supabase
        .from('social_content_suggestions')
        .select('realisation_id')
        .eq('agency_id', agencyId)
        .not('realisation_id', 'is', null)
        .gte('created_at', cutoff.toISOString());

      const recentlyUsedIds = new Set<string>(
        (recent || []).map(r => r.realisation_id).filter(Boolean) as string[]
      );

      // Score and filter
      const candidates: RealisationCandidate[] = realisations
        .map(r => {
          const mp = mediaMap.get(r.id) || { count: 0, hasBefore: false, hasAfter: false };
          const hasBeforeAfter = mp.hasBefore && mp.hasAfter;
          // Infer universe from title keywords
          const universe = inferUniverseFromTitle(r.title);
          const score = computeScore(
            hasBeforeAfter, mp.count, r.intervention_date, universe, recentlyUsedIds, r.id
          );
          return {
            id: r.id,
            title: r.title,
            agency_id: r.agency_id,
            intervention_date: r.intervention_date,
            universe,
            media_count: mp.count,
            has_before: mp.hasBefore,
            has_after: mp.hasAfter,
            score: Math.round(score * 100) / 100,
          };
        })
        .filter(c => c.score >= minScore)
        .sort((a, b) => b.score - a.score);

      return candidates;
    },
  });
}

/** Export for edge function reuse */
export { inferUniverseFromTitle, UNIVERSE_KEYWORDS };
