/**
 * PROXY CLIENT APOGÉE SÉCURISÉ
 * 
 * Client pour le proxy Apogée avec cache mémoire uniquement.
 * 
 * ARCHITECTURE SIMPLIFIÉE:
 * - Cache MÉMOIRE uniquement (pas localStorage - trop petit pour 40+ agences)
 * - Déduplication des requêtes concurrentes identiques
 * - TTL configurable (défaut 2h)
 * - Pas de throttling bloquant côté client
 * 
 * Le rate limiting est géré côté serveur (300 req/min pour franchiseurs).
 * 
 * Usage:
 * ```typescript
 * import { apogeeProxy } from '@/services/apogeeProxy';
 * 
 * // Pour une agence spécifique
 * const factures = await apogeeProxy.getFactures({ agencySlug: 'dax' });
 * 
 * // Charger toutes les données d'une agence
 * const data = await apogeeProxy.getAllData('dax');
 * 
 * // Vider le cache
 * apogeeProxy.clearCache();
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Cache TTL - Default 2 hours
let CACHE_TTL_MS = 2 * 60 * 60 * 1000;

// Délai entre chaque appel API (ms) pour éviter rate limiting
const API_THROTTLE_DELAY_MS = 500;

/**
 * Fonction sleep pour throttling
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Set the cache TTL
 */
export function setApogeeCacheTTL(ttlMs: number): void {
  CACHE_TTL_MS = ttlMs;
  logApogee.info(`[CACHE] TTL set to ${ttlMs / 1000 / 60} minutes`);
}

// =============================================================================
// MEMORY CACHE
// =============================================================================

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Memory cache - persists for session duration
const memoryCache = new Map<string, CacheEntry>();

// In-flight request deduplication
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Generate cache key from endpoint + agency + filters
 */
function getCacheKey(endpoint: string, agencySlug: string, filters?: Record<string, unknown>): string {
  const filterStr = filters ? JSON.stringify(filters) : '{}';
  return `${endpoint}:${agencySlug}:${filterStr}`;
}

/**
 * Get cached response if valid
 */
function getCachedResponse<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Store response in cache
 */
function setCachedResponse<T>(key: string, data: T): void {
  const now = Date.now();
  memoryCache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS,
  });
  logApogee.debug(`[CACHE] Stored ${key}`);
}

/**
 * Clear cache (optionally for specific agency)
 */
export function clearApogeeCache(agencySlug?: string): void {
  if (agencySlug) {
    const keysToDelete: string[] = [];
    for (const key of memoryCache.keys()) {
      if (key.includes(`:${agencySlug}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => memoryCache.delete(k));
    logApogee.info(`[CACHE] Cleared ${keysToDelete.length} entries for agency ${agencySlug}`);
  } else {
    const count = memoryCache.size;
    memoryCache.clear();
    logApogee.info(`[CACHE] Cleared all ${count} entries`);
  }
}

/**
 * Get cache statistics
 */
export function getApogeeCacheInfo(): { 
  entries: number; 
  ttlMinutes: number;
  agencies: string[];
} {
  const agencies = new Set<string>();
  for (const key of memoryCache.keys()) {
    const parts = key.split(':');
    if (parts[1]) agencies.add(parts[1]);
  }
  
  return {
    entries: memoryCache.size,
    ttlMinutes: Math.round(CACHE_TTL_MS / 1000 / 60),
    agencies: Array.from(agencies),
  };
}

// Legacy alias
export const clearProxyCache = clearApogeeCache;

// =============================================================================
// PROXY INTERFACE
// =============================================================================

export interface ApogeeProxyOptions {
  agencySlug?: string;
  filters?: Record<string, unknown>;
  skipCache?: boolean;
  bypassCache?: boolean;
}

interface ApogeeProxyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    endpoint: string;
    agencySlug: string;
    timestamp: string;
    itemCount?: number;
  };
}

// =============================================================================
// CORE PROXY FUNCTION
// =============================================================================

/**
 * Execute proxy request
 */
async function executeRequest<T>(
  endpoint: string,
  agencySlug: string,
  filters?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<ApogeeProxyResponse<T>>('proxy-apogee', {
    body: {
      endpoint,
      agencySlug,
      filters,
    },
  });

  if (error) {
    // Check for rate limit - log but don't block forever
    if (error.message?.includes('429')) {
      logApogee.warn(`[PROXY] Rate limited on ${endpoint}:${agencySlug}`);
      throw new Error(`Rate limited: ${endpoint}`);
    }
    throw new Error(error.message || `API error on ${endpoint}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || `Failed: ${endpoint}`);
  }

  logApogee.debug(`[PROXY] Success ${endpoint}`);
  return data.data as T;
}

/**
 * Main proxy function with caching and deduplication
 */
async function proxyRequest<T>(
  endpoint: string,
  options: ApogeeProxyOptions = {}
): Promise<T> {
  const { agencySlug, filters, skipCache, bypassCache } = options;
  const shouldBypassCache = skipCache || bypassCache;
  
  if (!agencySlug) {
    throw new Error('agencySlug is required for proxy requests');
  }
  
  const cacheKey = getCacheKey(endpoint, agencySlug, filters);
  
  // Check cache first (unless bypassing)
  if (!shouldBypassCache) {
    const cached = getCachedResponse<T>(cacheKey);
    if (cached !== null) {
      logApogee.debug(`[CACHE] Hit ${cacheKey}`);
      return cached;
    }
  }
  
  // Check for in-flight request (deduplication)
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    logApogee.debug(`[PROXY] Dedup ${cacheKey}`);
    return inFlight as Promise<T>;
  }
  
  // Execute request
  const requestPromise = executeRequest<T>(endpoint, agencySlug, filters)
    .then((result) => {
      setCachedResponse(cacheKey, result);
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  
  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

// =============================================================================
// TYPED API METHODS
// =============================================================================

export interface ApogeeProxy {
  getUsers: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  getClients: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  getProjects: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  getInterventions: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  getFactures: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  getDevis: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  getInterventionsCreneaux: <T = any[]>(options?: ApogeeProxyOptions) => Promise<T>;
  
  // Utility methods
  clearCache: (agencySlug?: string) => void;
  getCacheInfo: () => { entries: number; ttlMinutes: number; agencies: string[] };
  setTTL: (ttlMs: number) => void;
  
  // Batch method for loading all data for an agency
  getAllData: (agencySlug: string, bypassCache?: boolean) => Promise<{
    users: any[];
    clients: any[];
    projects: any[];
    interventions: any[];
    factures: any[];
    devis: any[];
  }>;
}

export const apogeeProxy: ApogeeProxy = {
  getUsers: (options = {}) => proxyRequest('apiGetUsers', options),
  getClients: (options = {}) => proxyRequest('apiGetClients', options),
  getProjects: (options = {}) => proxyRequest('apiGetProjects', options),
  getInterventions: (options = {}) => proxyRequest('apiGetInterventions', options),
  getFactures: (options = {}) => proxyRequest('apiGetFactures', options),
  getDevis: (options = {}) => proxyRequest('apiGetDevis', options),
  getInterventionsCreneaux: (options = {}) => proxyRequest('getInterventionsCreneaux', options),
  
  clearCache: clearApogeeCache,
  getCacheInfo: getApogeeCacheInfo,
  setTTL: setApogeeCacheTTL,
  
  /**
   * Load all data for an agency SEQUENTIALLY WITH THROTTLING
   * Évite les 429 rate limit en espaçant les requêtes de 500ms
   * Results are cached for TTL duration (2h default)
   */
  getAllData: async (agencySlug, bypassCache = false) => {
    const opts = { agencySlug, bypassCache };
    
    logApogee.info(`[PROXY] Loading all data SEQUENTIALLY WITH THROTTLE (${API_THROTTLE_DELAY_MS}ms) for ${agencySlug}`);
    const startTime = Date.now();
    
    // Execute requests ONE BY ONE with delay to avoid rate limiting
    const users = await proxyRequest<any[]>('apiGetUsers', opts);
    await sleep(API_THROTTLE_DELAY_MS);
    
    const clients = await proxyRequest<any[]>('apiGetClients', opts);
    await sleep(API_THROTTLE_DELAY_MS);
    
    const projects = await proxyRequest<any[]>('apiGetProjects', opts);
    await sleep(API_THROTTLE_DELAY_MS);
    
    const interventions = await proxyRequest<any[]>('apiGetInterventions', opts);
    await sleep(API_THROTTLE_DELAY_MS);
    
    const factures = await proxyRequest<any[]>('apiGetFactures', opts);
    await sleep(API_THROTTLE_DELAY_MS);
    
    const devis = await proxyRequest<any[]>('apiGetDevis', opts);
    
    const duration = Date.now() - startTime;
    logApogee.info(`[PROXY] All data loaded for ${agencySlug} in ${duration}ms (throttled sequential)`);
    
    return { 
      users: users || [], 
      clients: clients || [], 
      projects: projects || [], 
      interventions: interventions || [], 
      factures: factures || [], 
      devis: devis || [] 
    };
  },
};

// Default export
export default apogeeProxy;
