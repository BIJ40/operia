/**
 * CLIENT PROXY APOGÉE SÉCURISÉ
 * 
 * Ce service centralise TOUS les appels à l'API Apogée via le proxy backend.
 * AUCUNE clé API n'est exposée côté client.
 * 
 * Features:
 * - Request deduplication: identical concurrent requests share the same promise
 * - TTL cache: responses cached for 60 seconds to reduce API calls
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

function getCacheKey(endpoint: string, options: ApogeeProxyOptions): string {
  return `${endpoint}:${options.agencySlug || 'default'}:${JSON.stringify(options.filters || {})}`;
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
 * Appelle le proxy Apogée sécurisé avec deduplication et cache
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

  logApogee.debug(`[PROXY] Calling ${endpoint}`, { agencySlug: agencySlug || 'user-default' });

  // Create the actual request promise
  const requestPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke<ApogeeProxyResponse<T>>('proxy-apogee', {
        body: {
          endpoint,
          agencySlug,
          filters,
        },
      });

      if (error) {
        logApogee.error(`[PROXY] Function error for ${endpoint}:`, error);
        throw new Error(`Erreur proxy Apogée: ${error.message}`);
      }

      if (!data?.success) {
        logApogee.error(`[PROXY] API error for ${endpoint}:`, data?.error);
        throw new Error(data?.error || 'Erreur inconnue du proxy Apogée');
      }

      logApogee.debug(`[PROXY] Success ${endpoint}:`, { itemCount: data.meta?.itemCount });
      
      // Cache the successful response
      setCachedResponse(cacheKey, data.data);
      
      return data.data as T;
    } finally {
      // Always remove from in-flight map when done
      inFlightRequests.delete(cacheKey);
    }
  })();

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
   * Récupère toutes les données en parallèle
   */
  getAllData: async (options?: ApogeeProxyOptions) => {
    const [users, clients, projects, interventions, factures, devis] = await Promise.all([
      apogeeProxy.getUsers(options),
      apogeeProxy.getClients(options),
      apogeeProxy.getProjects(options),
      apogeeProxy.getInterventions(options),
      apogeeProxy.getFactures(options),
      apogeeProxy.getDevis(options),
    ]);

    return { users, clients, projects, interventions, factures, devis };
  },
};

export default apogeeProxy;
