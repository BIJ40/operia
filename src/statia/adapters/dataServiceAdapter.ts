/**
 * StatIA Phase 2 - DataService Adapter
 * Bridge entre DataService existant et ApogeeDataServices de StatIA
 * 
 * IMPORTANT: Les données sont chargées via le proxy Apogée qui utilise
 * l'agence du profil utilisateur connecté. Le paramètre agencySlug
 * sert à invalider le cache si l'agence change.
 */

import { DataService, CachedData } from '@/apogee-connect/services/dataService';
import { ApogeeDataServices } from '../engine/loaders';
import { DateRange } from '../definitions/types';
import { logApogee } from '@/lib/logger';

/**
 * Crée une instance ApogeeDataServices compatible avec StatIA
 * à partir du DataService existant
 */
export function createApogeeDataServicesAdapter(): ApogeeDataServices {
  // Cache local pour éviter les appels multiples
  let cachedData: CachedData | null = null;
  let cachedAgency: string | null = null;
  let lastLoadTime = 0;
  const CACHE_TTL = 120 * 1000; // 2 minutes (augmenté de 30s)
  
  // Déduplication des requêtes en vol
  let loadingPromise: Promise<CachedData> | null = null;

  const loadDataIfNeeded = async (agencySlug: string): Promise<CachedData> => {
    const now = Date.now();
    
    // Invalider le cache si l'agence change
    if (cachedAgency && cachedAgency !== agencySlug) {
      logApogee.debug(`[StatIA Adapter] Changement d'agence détecté: ${cachedAgency} -> ${agencySlug}, invalidation du cache`);
      cachedData = null;
      loadingPromise = null;
      DataService.clearCache();
    }
    
    // Retourner le cache s'il est valide
    if (cachedData && (now - lastLoadTime) < CACHE_TTL) {
      return cachedData;
    }
    
    // Si une requête est déjà en cours, attendre sa résolution
    if (loadingPromise) {
      logApogee.debug(`[StatIA Adapter] Requête déjà en cours, attente...`);
      return loadingPromise;
    }
    
    // Créer une nouvelle promesse de chargement
    logApogee.debug(`[StatIA Adapter] Chargement données via DataService pour agence: ${agencySlug}`);
    
    loadingPromise = (async () => {
      try {
        const loaded = await DataService.loadAllData(true, false, agencySlug);
        const result: CachedData = {
          users: loaded.users || [],
          clients: loaded.clients || [],
          projects: loaded.projects || [],
          interventions: loaded.interventions || [],
          factures: loaded.factures || [],
          devis: loaded.devis || [],
          creneaux: loaded.creneaux || [],
        };
        cachedData = result;
        cachedAgency = agencySlug;
        lastLoadTime = Date.now();
        return result;
      } finally {
        loadingPromise = null;
      }
    })();
    
    return loadingPromise;
  };

  return {
    getFactures: async (agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.factures || [];
    },
    
    getDevis: async (agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.devis || [];
    },
    
    getInterventions: async (agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.interventions || [];
    },
    
    getProjects: async (agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.projects || [];
    },
    
    getUsers: async (agencySlug: string) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.users || [];
    },
    
    getClients: async (agencySlug: string) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.clients || [];
    },

    getCreneaux: async (agencySlug: string) => {
      const data = await loadDataIfNeeded(agencySlug);
      return data.creneaux || [];
    },
  };
}

/**
 * Singleton global de l'adaptateur
 */
let globalAdapter: ApogeeDataServices | null = null;

export function getGlobalApogeeDataServices(): ApogeeDataServices {
  if (!globalAdapter) {
    globalAdapter = createApogeeDataServicesAdapter();
  }
  return globalAdapter;
}

/**
 * Reset l'adaptateur (utile pour les tests ou changement d'agence)
 */
export function resetApogeeDataServicesAdapter(): void {
  globalAdapter = null;
}
