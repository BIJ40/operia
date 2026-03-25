/**
 * Project Detail Loader — Enrichissement à la demande via apiGetProjectByRef
 * 
 * RÈGLES STRICTES:
 * - Ne JAMAIS appeler en masse sur une liste
 * - Ne JAMAIS faire de prefetch automatique
 * - Uniquement après ACTION EXPLICITE utilisateur
 * - Cache mémoire LRU (max 100, TTL 10min)
 * - Déduplication des appels concurrents
 */

import { supabase } from '@/integrations/supabase/client';
import { normalizeGeneratedDocs, type NormalizedDoc } from './normalizeGeneratedDocs';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectDetail {
  /** Données brutes du projet enrichi */
  raw: Record<string, unknown>;
  /** Documents générés normalisés (optionnel, nullable) */
  documents: NormalizedDoc[];
  /** Timestamp du chargement */
  loadedAt: number;
}

export interface ProjectDetailResult {
  success: boolean;
  data?: ProjectDetail;
  error?: string;
}

// =============================================================================
// CACHE LRU
// =============================================================================

interface CacheEntry {
  data: ProjectDetail;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX_ENTRIES = 100;

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ProjectDetailResult>>();

function cacheKey(ref: string, agencySlug: string): string {
  return `${agencySlug}:${ref}`;
}

function getCached(key: string): ProjectDetail | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ProjectDetail): void {
  // LRU eviction
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// =============================================================================
// LOADER
// =============================================================================

/**
 * Charge le détail d'un projet par sa ref.
 * Ne doit être appelé qu'après action explicite utilisateur.
 * 
 * generatedDocs est traité comme optionnel/nullable — l'absence
 * de documents ne provoque jamais d'erreur.
 */
export async function getProjectDetail(
  ref: string,
  agencySlug: string
): Promise<ProjectDetailResult> {
  if (!ref || !agencySlug) {
    return { success: false, error: 'ref et agencySlug requis' };
  }

  const key = cacheKey(ref, agencySlug);

  // 1. Cache hit
  const cached = getCached(key);
  if (cached) {
    return { success: true, data: cached };
  }

  // 2. Déduplication
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  // 3. Fetch
  const promise = executeDetailFetch(ref, agencySlug, key);
  inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

async function executeDetailFetch(
  ref: string,
  agencySlug: string,
  key: string
): Promise<ProjectDetailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('proxy-apogee', {
      body: {
        endpoint: 'apiGetProjectByRef',
        agencySlug,
        filters: { ref },
      },
    });

    if (error) {
      console.warn('[ProjectDetailLoader] Fetch error:', error.message);
      return { success: false, error: error.message || 'Erreur de chargement' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Réponse invalide' };
    }

    const rawProject = data.data as Record<string, unknown> | null;
    if (!rawProject) {
      return { success: false, error: 'Dossier non trouvé' };
    }

    // Normaliser generatedDocs (optionnel, nullable, partiellement renseigné)
    const generatedDocs = (rawProject as any)?.generatedDocs;
    const documents = normalizeGeneratedDocs(generatedDocs);

    const detail: ProjectDetail = {
      raw: rawProject,
      documents,
      loadedAt: Date.now(),
    };

    setCache(key, detail);
    return { success: true, data: detail };
  } catch (err) {
    console.error('[ProjectDetailLoader] Exception:', err);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Vide le cache (optionnel: pour une agence spécifique)
 */
export function clearProjectDetailCache(agencySlug?: string): void {
  if (agencySlug) {
    for (const k of cache.keys()) {
      if (k.startsWith(`${agencySlug}:`)) cache.delete(k);
    }
  } else {
    cache.clear();
  }
}
