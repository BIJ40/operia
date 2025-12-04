/**
 * CLIENT PROXY APOGÉE SÉCURISÉ
 * 
 * Ce service centralise TOUS les appels à l'API Apogée via le proxy backend.
 * AUCUNE clé API n'est exposée côté client.
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

/**
 * Appelle le proxy Apogée sécurisé
 */
async function callProxy<T = unknown>(
  endpoint: string,
  options: ApogeeProxyOptions = {}
): Promise<T> {
  const { agencySlug, filters } = options;

  logApogee.debug(`[PROXY] Calling ${endpoint}`, { agencySlug: agencySlug || 'user-default' });

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
  
  return data.data as T;
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
