/**
 * StatIA Phase 2 - DataService Adapter
 * Bridge entre DataService existant et ApogeeDataServices de StatIA
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
  let lastLoadTime = 0;
  const CACHE_TTL = 30 * 1000; // 30 secondes

  const loadDataIfNeeded = async (): Promise<CachedData> => {
    const now = Date.now();
    if (cachedData && (now - lastLoadTime) < CACHE_TTL) {
      return cachedData;
    }
    
    logApogee.debug('[StatIA Adapter] Chargement données via DataService');
    const loaded = await DataService.loadAllData(true);
    cachedData = {
      users: loaded.users || [],
      clients: loaded.clients || [],
      projects: loaded.projects || [],
      interventions: loaded.interventions || [],
      factures: loaded.factures || [],
      devis: loaded.devis || [],
      creneaux: loaded.creneaux || [],
    };
    lastLoadTime = now;
    return cachedData;
  };

  return {
    getFactures: async (_agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded();
      return data.factures || [];
    },
    
    getDevis: async (_agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded();
      return data.devis || [];
    },
    
    getInterventions: async (_agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded();
      return data.interventions || [];
    },
    
    getProjects: async (_agencySlug: string, _dateRange: DateRange) => {
      const data = await loadDataIfNeeded();
      return data.projects || [];
    },
    
    getUsers: async (_agencySlug: string) => {
      const data = await loadDataIfNeeded();
      return data.users || [];
    },
    
    getClients: async (_agencySlug: string) => {
      const data = await loadDataIfNeeded();
      return data.clients || [];
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
