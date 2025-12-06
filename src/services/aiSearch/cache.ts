/**
 * StatIA AI Search - Cache multi-niveau
 * Cache mémoire (LLM intents) + Supabase (stats results)
 */

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttlMs: number;
}

interface StatsCacheParams {
  metricId: string;
  agencyId: string;
  period: { from: string | null; to: string | null };
  filters?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// CACHE MÉMOIRE (LLM Intents)
// ═══════════════════════════════════════════════════════════════

const MEMORY_INTENT_CACHE = new Map<string, CacheEntry<unknown>>();
const MEMORY_STATS_CACHE = new Map<string, CacheEntry<unknown>>();

const MAX_MEM_ENTRIES = 500;
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STATS_MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes en mémoire

/**
 * Trim le cache mémoire si trop d'entrées (LRU simple)
 */
function trimMemoryCache(map: Map<string, CacheEntry<unknown>>) {
  if (map.size <= MAX_MEM_ENTRIES) return;
  
  // Supprimer les entrées les plus anciennes
  const entries = Array.from(map.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  const toDelete = entries.slice(0, map.size - MAX_MEM_ENTRIES);
  for (const [key] of toDelete) {
    map.delete(key);
  }
}

/**
 * Vérifie si une entrée cache est encore valide
 */
function isEntryValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttlMs;
}

// ═══════════════════════════════════════════════════════════════
// CACHE LLM INTENTS (mémoire uniquement)
// ═══════════════════════════════════════════════════════════════

/**
 * Récupère un intent LLM depuis le cache mémoire
 */
export function getIntentFromMemory(questionNormalized: string): unknown | null {
  const entry = MEMORY_INTENT_CACHE.get(questionNormalized);
  if (isEntryValid(entry)) {
    return entry.value;
  }
  // Supprimer entrée expirée
  if (entry) MEMORY_INTENT_CACHE.delete(questionNormalized);
  return null;
}

/**
 * Stocke un intent LLM dans le cache mémoire
 */
export function setIntentToMemory(questionNormalized: string, value: unknown): void {
  MEMORY_INTENT_CACHE.set(questionNormalized, {
    value,
    timestamp: Date.now(),
    ttlMs: INTENT_TTL_MS,
  });
  trimMemoryCache(MEMORY_INTENT_CACHE);
}

/**
 * Vide le cache intents
 */
export function clearIntentCache(): void {
  MEMORY_INTENT_CACHE.clear();
}

// ═══════════════════════════════════════════════════════════════
// CLÉS DE CACHE STATS
// ═══════════════════════════════════════════════════════════════

/**
 * Génère une clé de cache unique pour les stats
 */
export function buildStatsCacheKey(params: StatsCacheParams): string {
  const base = {
    m: params.metricId,
    a: params.agencyId,
    f: params.period.from,
    t: params.period.to,
    filters: params.filters ?? {},
  };
  return `stat:${JSON.stringify(base)}`;
}

/**
 * Détermine le TTL en secondes selon la période
 * - Mois en cours → 5 min
 * - Mois clôturés → 24h
 */
export function computeStatsTTL(period: { from: string | null; to: string | null }): number {
  if (!period.to) return 300; // 5 min par défaut
  
  const now = new Date();
  const toDate = new Date(period.to);
  
  // Si la période se termine ce mois-ci → TTL court
  if (
    toDate.getFullYear() === now.getFullYear() &&
    toDate.getMonth() === now.getMonth()
  ) {
    return 300; // 5 minutes
  }
  
  // Période clôturée → TTL long
  return 86400; // 24 heures
}

// ═══════════════════════════════════════════════════════════════
// CACHE STATS (mémoire + Supabase)
// ═══════════════════════════════════════════════════════════════

/**
 * Récupère un résultat stats depuis le cache (mémoire puis Supabase)
 */
export async function getStatsFromCache(key: string): Promise<unknown | null> {
  // 1. Vérifier mémoire
  const memEntry = MEMORY_STATS_CACHE.get(key);
  if (isEntryValid(memEntry)) {
    return memEntry.value;
  }
  if (memEntry) MEMORY_STATS_CACHE.delete(key);

  // 2. Vérifier Supabase
  try {
    const { data, error } = await supabase
      .from('ai_search_cache')
      .select('value, created_at, ttl_seconds')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;

    const created = new Date(data.created_at).getTime();
    const ttlMs = (data.ttl_seconds ?? 900) * 1000;
    
    if (Date.now() - created > ttlMs) {
      supabase.from('ai_search_cache').delete().eq('key', key);
      return null;
    }

    MEMORY_STATS_CACHE.set(key, {
      value: data.value,
      timestamp: Date.now(),
      ttlMs: STATS_MEMORY_TTL_MS,
    });
    trimMemoryCache(MEMORY_STATS_CACHE);

    return data.value;
  } catch {
    return null;
  }
}

/**
 * Stocke un résultat stats dans le cache (mémoire + Supabase)
 */
export async function setStatsToCache(
  key: string, 
  value: unknown, 
  ttlSeconds = 900
): Promise<void> {
  MEMORY_STATS_CACHE.set(key, {
    value,
    timestamp: Date.now(),
    ttlMs: ttlSeconds * 1000,
  });
  trimMemoryCache(MEMORY_STATS_CACHE);

  try {
    await supabase.from('ai_search_cache').upsert([{
      key,
      value: JSON.parse(JSON.stringify(value)),
      ttl_seconds: ttlSeconds,
    }], { onConflict: 'key' });
  } catch {
    // Silently fail
  }
}

/**
 * Vide le cache stats
 */
export function clearStatsCache(): void {
  MEMORY_STATS_CACHE.clear();
}

/**
 * Vide tous les caches
 */
export function clearAllCaches(): void {
  clearIntentCache();
  clearStatsCache();
}

// ═══════════════════════════════════════════════════════════════
// STATISTIQUES CACHE
// ═══════════════════════════════════════════════════════════════

/**
 * Retourne des statistiques sur l'état des caches
 */
export function getCacheStats(): {
  intentCacheSize: number;
  statsCacheSize: number;
  maxEntries: number;
} {
  return {
    intentCacheSize: MEMORY_INTENT_CACHE.size,
    statsCacheSize: MEMORY_STATS_CACHE.size,
    maxEntries: MAX_MEM_ENTRIES,
  };
}
