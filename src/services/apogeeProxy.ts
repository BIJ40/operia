/**
 * CLIENT PROXY APOGÉE SÉCURISÉ
 * 
 * Ce service centralise TOUS les appels à l'API Apogée via le proxy backend.
 * AUCUNE clé API n'est exposée côté client.
 * 
 * Features:
 * - Request deduplication: identical concurrent requests share the same promise
 * - TTL cache: responses cached for 60 seconds to reduce API calls
 * - Request queue: limits concurrent requests to avoid rate limiting
 * - Auto-retry on 429 with exponential backoff
 * 
 * Usage:
 * ```typescript
 * import { apogeeProxy } from '@/services/apogeeProxy';
 * 
 * // Pour l'agence de l'utilisateur connecté
 * const users = await apogeeProxy.getUsers();
 * 
 * // Pour une agence spécifique (franchiseur uniquement)
 * const factures = await apogeeProxy.getFactures({ agencySlug: 'dax' });
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';

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

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<unknown>>();

// TTL cache for responses (60 seconds)
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Request queue configuration
const MAX_CONCURRENT_REQUESTS = 10; // Max parallel requests
const REQUEST_DELAY_MS = 50; // Delay between batch starts
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Queue state
let activeRequests = 0;
const requestQueue: Array<{
  execute: () => Promise<void>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

function getCacheKey(endpoint: string, options: ApogeeProxyOptions): string {
  // CRITICAL: Always include agencySlug in cache key - no 'default' fallback
  // This prevents admin from seeing cached data from wrong agency
  const slug = options.agencySlug || '_no_agency_';
  return `${endpoint}:${slug}:${JSON.stringify(options.filters || {})}`;
}

function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logApogee.debug(`[PROXY] Cache hit for ${key}`);
    return cached.data as T;
  }
  if (cached) {
    responseCache.delete(key); // Expired
  }
  return null;
}

function setCachedResponse(key: string, data: unknown): void {
  responseCache.set(key, { data, timestamp: Date.now() });
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
    for (const key of responseCache.keys()) {
      if (key.includes(`:${agencySlug}:`)) {
        responseCache.delete(key);
      }
    }
    logApogee.debug(`[PROXY] Cache cleared for agency: ${agencySlug}`);
  } else {
    // Clear all cache
    responseCache.clear();
    logApogee.debug(`[PROXY] Full cache cleared`);
  }
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
