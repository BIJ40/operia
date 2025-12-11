/**
 * CLIENT PROXY APOGÉE SÉCURISÉ
 * 
 * Ce service centralise TOUS les appels à l'API Apogée via le proxy backend.
 * AUCUNE clé API n'est exposée côté client.
 * 
 * Features:
 * - PERSISTENT CACHE: localStorage cache with configurable TTL (default 2h)
 * - Request deduplication: identical concurrent requests share the same promise
 * - Request queue: limits concurrent requests to avoid rate limiting
 * - Auto-retry on 429 with exponential backoff
 * 
 * Usage:
 * ```typescript
 * import { apogeeProxy, setApogéeCacheTTL, clearApogeeCache } from '@/services/apogeeProxy';
 * 
 * // Configure cache TTL (optional, default 2h)
 * setApogéeCacheTTL(6 * 60 * 60 * 1000); // 6 hours
 * 
 * // Pour l'agence de l'utilisateur connecté
 * const users = await apogeeProxy.getUsers();
 * 
 * // Pour une agence spécifique (franchiseur uniquement)
 * const factures = await apogeeProxy.getFactures({ agencySlug: 'dax' });
 * 
 * // Force refresh (bypass cache)
 * const freshData = await apogeeProxy.getFactures({ skipCache: true });
 * 
 * // Clear all cached data
 * clearApogeeCache();
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_PREFIX = 'apogee_cache_';
const STORAGE_META_KEY = 'apogee_cache_meta';

// Default TTL: 2 hours (configurable)
let PERSISTENT_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

// In-memory cache for current session (faster access)
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<unknown>>();

// Request queue configuration
const MAX_CONCURRENT_REQUESTS = 10;
const REQUEST_DELAY_MS = 50;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Queue state
let activeRequests = 0;
const requestQueue: Array<{
  execute: () => Promise<void>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

export interface ApogeeProxyOptions {
  agencySlug?: string;
  filters?: Record<string, unknown>;
  skipCache?: boolean;
}

export interface ApogeeProxyResponse<T = unknown> {
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

export interface ApogeeCacheInfo {
  totalEntries: number;
  totalSizeKB: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  entriesByAgency: Record<string, number>;
}

// ============================================================================
// CACHE TTL CONFIGURATION
// ============================================================================

/**
 * Configure le TTL du cache persistant
 * @param ttlMs Durée en millisecondes (ex: 2 * 60 * 60 * 1000 pour 2h)
 */
export function setApogeeCacheTTL(ttlMs: number): void {
  PERSISTENT_CACHE_TTL_MS = ttlMs;
  logApogee.info(`[CACHE] TTL configuré à ${ttlMs / 1000 / 60} minutes`);
}

/**
 * Retourne le TTL actuel en millisecondes
 */
export function getApogeeCacheTTL(): number {
  return PERSISTENT_CACHE_TTL_MS;
}

// ============================================================================
// CACHE STORAGE FUNCTIONS
// ============================================================================

function getCacheKey(endpoint: string, options: ApogeeProxyOptions): string {
  const slug = options.agencySlug || '_no_agency_';
  return `${endpoint}:${slug}:${JSON.stringify(options.filters || {})}`;
}

function getStorageKey(cacheKey: string): string {
  return `${STORAGE_PREFIX}${cacheKey}`;
}

/**
 * Sauvegarde dans localStorage avec compression basique
 */
function saveToStorage(key: string, data: unknown, timestamp: number): void {
  try {
    const storageKey = getStorageKey(key);
    const payload = JSON.stringify({ data, timestamp });
    localStorage.setItem(storageKey, payload);
    
    // Update meta (track all cache keys)
    updateCacheMeta(key, timestamp);
  } catch (e) {
    // localStorage full or unavailable - just use memory cache
    logApogee.warn(`[CACHE] localStorage save failed for ${key}:`, e);
  }
}

/**
 * Charge depuis localStorage
 */
function loadFromStorage<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const storageKey = getStorageKey(key);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    return parsed as { data: T; timestamp: number };
  } catch (e) {
    logApogee.warn(`[CACHE] localStorage load failed for ${key}:`, e);
    return null;
  }
}

/**
 * Met à jour les métadonnées du cache
 */
function updateCacheMeta(key: string, timestamp: number): void {
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    const meta: Record<string, number> = raw ? JSON.parse(raw) : {};
    meta[key] = timestamp;
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
  } catch (e) {
    // Ignore meta errors
  }
}

/**
 * Supprime une entrée du cache
 */
function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(getStorageKey(key));
    
    // Update meta
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (raw) {
      const meta = JSON.parse(raw);
      delete meta[key];
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
    }
  } catch (e) {
    // Ignore
  }
}

// ============================================================================
// CACHE ACCESS FUNCTIONS
// ============================================================================

function getCachedResponse<T>(key: string): T | null {
  const now = Date.now();
  
  // 1. Check memory cache first (fastest)
  const memoryCached = memoryCache.get(key);
  if (memoryCached && now - memoryCached.timestamp < PERSISTENT_CACHE_TTL_MS) {
    logApogee.debug(`[CACHE] Memory hit for ${key}`);
    return memoryCached.data as T;
  }
  
  // 2. Check localStorage (persistent)
  const storageCached = loadFromStorage<T>(key);
  if (storageCached && now - storageCached.timestamp < PERSISTENT_CACHE_TTL_MS) {
    // Restore to memory cache for faster subsequent access
    memoryCache.set(key, storageCached);
    logApogee.debug(`[CACHE] Storage hit for ${key} (age: ${Math.round((now - storageCached.timestamp) / 1000 / 60)}min)`);
    return storageCached.data;
  }
  
  // 3. Expired or not found - clean up
  if (memoryCached) memoryCache.delete(key);
  if (storageCached) removeFromStorage(key);
  
  return null;
}

function setCachedResponse(key: string, data: unknown): void {
  const timestamp = Date.now();
  
  // Save to both memory and localStorage
  memoryCache.set(key, { data, timestamp });
  saveToStorage(key, data, timestamp);
  
  logApogee.debug(`[CACHE] Stored ${key}`);
}

/**
 * Process the next item in the request queue
 */
function processQueue(): void {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }

  const item = requestQueue.shift();
  if (!item) return;

  activeRequests++;
  
  item.execute()
    .then(() => item.resolve(undefined))
    .catch((err) => item.reject(err))
    .finally(() => {
      activeRequests--;
      // Small delay before processing next to avoid burst
      setTimeout(processQueue, REQUEST_DELAY_MS);
    });
}

/**
 * Add a request to the queue
 */
function enqueue<T>(execute: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      execute: async () => {
        try {
          const result = await execute();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    processQueue();
  });
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Vide le cache pour une agence spécifique ou tout le cache
 * Utile lors d'un changement d'agence par un admin
 */
export function clearProxyCache(agencySlug?: string): void {
  if (agencySlug) {
    // Clear only cache entries for this agency
    for (const key of memoryCache.keys()) {
      if (key.includes(`:${agencySlug}:`)) {
        memoryCache.delete(key);
        removeFromStorage(key);
      }
    }
    logApogee.info(`[CACHE] Cache cleared for agency: ${agencySlug}`);
  } else {
    // Clear all cache
    clearApogeeCache();
  }
}

/**
 * Vide complètement le cache Apogée (mémoire + localStorage)
 */
export function clearApogeeCache(): void {
  // Clear memory
  memoryCache.clear();
  
  // Clear localStorage
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (raw) {
      const meta = JSON.parse(raw);
      for (const key of Object.keys(meta)) {
        localStorage.removeItem(getStorageKey(key));
      }
    }
    localStorage.removeItem(STORAGE_META_KEY);
    logApogee.info(`[CACHE] Full cache cleared`);
  } catch (e) {
    logApogee.warn(`[CACHE] Error clearing localStorage:`, e);
  }
}

/**
 * Retourne des informations sur le cache actuel
 */
export function getApogeeCacheInfo(): ApogeeCacheInfo {
  const entriesByAgency: Record<string, number> = {};
  let totalSize = 0;
  let oldestTimestamp: number | null = null;
  let newestTimestamp: number | null = null;
  let totalEntries = 0;
  
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (raw) {
      const meta: Record<string, number> = JSON.parse(raw);
      
      for (const [key, timestamp] of Object.entries(meta)) {
        totalEntries++;
        
        // Track timestamps
        if (oldestTimestamp === null || timestamp < oldestTimestamp) {
          oldestTimestamp = timestamp;
        }
        if (newestTimestamp === null || timestamp > newestTimestamp) {
          newestTimestamp = timestamp;
        }
        
        // Extract agency from key
        const parts = key.split(':');
        const agency = parts[1] || 'unknown';
        entriesByAgency[agency] = (entriesByAgency[agency] || 0) + 1;
        
        // Estimate size
        const storageKey = getStorageKey(key);
        const item = localStorage.getItem(storageKey);
        if (item) {
          totalSize += item.length * 2; // UTF-16 = 2 bytes per char
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return {
    totalEntries,
    totalSizeKB: Math.round(totalSize / 1024),
    oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null,
    newestEntry: newestTimestamp ? new Date(newestTimestamp) : null,
    entriesByAgency,
  };
}

/**
 * Execute a single API call with retry logic
 */
async function executeWithRetry<T>(
  endpoint: string,
  agencySlug: string | undefined,
  filters: Record<string, unknown> | undefined,
  retryCount = 0
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<ApogeeProxyResponse<T>>('proxy-apogee', {
    body: {
      endpoint,
      agencySlug,
      filters,
    },
  });

  // Handle rate limit (429)
  if (error?.message?.includes('429') || data?.error?.includes('Trop de requêtes')) {
    if (retryCount < MAX_RETRIES) {
      // Extract retryAfter from response or use exponential backoff
      const retryAfter = (data as any)?.retryAfter || Math.pow(2, retryCount) * RETRY_BASE_DELAY_MS / 1000;
      const delayMs = Math.min(retryAfter * 1000, 30000); // Max 30s wait
      
      logApogee.warn(`[PROXY] Rate limited on ${endpoint}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delayMs);
      return executeWithRetry<T>(endpoint, agencySlug, filters, retryCount + 1);
    }
    throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries`);
  }

  if (error) {
    logApogee.error(`[PROXY] Function error for ${endpoint}:`, error);
    throw new Error(`Erreur proxy Apogée: ${error.message}`);
  }

  if (!data?.success) {
    logApogee.error(`[PROXY] API error for ${endpoint}:`, data?.error);
    throw new Error(data?.error || 'Erreur inconnue du proxy Apogée');
  }

  return data.data as T;
}

/**
 * Appelle le proxy Apogée sécurisé avec deduplication, cache et queue
 */
async function callProxy<T = unknown>(
  endpoint: string,
  options: ApogeeProxyOptions = {}
): Promise<T> {
  const { agencySlug, filters, skipCache } = options;
  const cacheKey = getCacheKey(endpoint, options);

  // Check cache first (unless skipCache)
  if (!skipCache) {
    const cached = getCachedResponse<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  // Check for in-flight request with same key
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    logApogee.debug(`[PROXY] Deduplicating request for ${endpoint}`);
    return inFlight as Promise<T>;
  }

  logApogee.debug(`[PROXY] Queueing ${endpoint}`, { agencySlug: agencySlug || 'user-default' });

  // Create the actual request promise with queue
  const requestPromise = enqueue(async () => {
    try {
      const result = await executeWithRetry<T>(endpoint, agencySlug, filters);
      
      logApogee.debug(`[PROXY] Success ${endpoint}`);
      
      // Cache the successful response
      setCachedResponse(cacheKey, result);
      
      return result;
    } finally {
      // Always remove from in-flight map when done
      inFlightRequests.delete(cacheKey);
    }
  });

  // Store in in-flight map
  inFlightRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * API Apogée via proxy sécurisé
 */
export const apogeeProxy = {
  /**
   * Récupère les utilisateurs de l'agence
   */
  getUsers: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('apiGetUsers', options),

  /**
   * Récupère les clients
   */
  getClients: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('apiGetClients', options),

  /**
   * Récupère les projets/dossiers
   */
  getProjects: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('apiGetProjects', options),

  /**
   * Récupère les interventions
   */
  getInterventions: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('apiGetInterventions', options),

  /**
   * Récupère les factures
   */
  getFactures: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('apiGetFactures', options),

  /**
   * Récupère les devis
   */
  getDevis: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('apiGetDevis', options),

  /**
   * Récupère les créneaux d'interventions
   */
  getInterventionsCreneaux: (options?: ApogeeProxyOptions) => 
    callProxy<any[]>('getInterventionsCreneaux', options),

  /**
   * Récupère toutes les données en parallèle (avec queue intégrée)
   */
  getAllData: async (options?: ApogeeProxyOptions) => {
    // Use Promise.allSettled to prevent one failure from breaking all
    // The queue will handle rate limiting automatically
    const results = await Promise.allSettled([
      apogeeProxy.getUsers(options),
      apogeeProxy.getClients(options),
      apogeeProxy.getProjects(options),
      apogeeProxy.getInterventions(options),
      apogeeProxy.getFactures(options),
      apogeeProxy.getDevis(options),
    ]);

    const extractValue = (result: PromiseSettledResult<any[]>): any[] => 
      result.status === 'fulfilled' ? result.value : [];

    return {
      users: extractValue(results[0]),
      clients: extractValue(results[1]),
      projects: extractValue(results[2]),
      interventions: extractValue(results[3]),
      factures: extractValue(results[4]),
      devis: extractValue(results[5]),
    };
  },
};

export default apogeeProxy;
