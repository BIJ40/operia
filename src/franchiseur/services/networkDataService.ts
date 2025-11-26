import { DataService } from '@/apogee-connect/services/dataService';
import { setApiBaseUrl } from '@/apogee-connect/services/api';
import { DateRange } from '../contexts/NetworkFiltersContext';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const dataCache = new Map<string, CacheEntry>();

export class NetworkDataService {
  /**
   * Load data for multiple agencies SEQUENTIALLY to avoid BASE_URL race condition
   */
  static async loadMultiAgencyData(agencySlugs: string[], dateRange?: DateRange) {
    const results = [];
    
    console.log(`🔄 Chargement de ${agencySlugs.length} agences...`);
    
    // Load agencies sequentially to avoid BASE_URL conflicts
    for (const agencySlug of agencySlugs) {
      const cacheKey = `${agencySlug}-${dateRange?.from.toISOString()}-${dateRange?.to.toISOString()}`;
      
      // Check cache
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`✅ ${agencySlug}: données en cache`);
        results.push({ agencyId: agencySlug, data: cached.data });
        continue;
      }

      // Load fresh data
      try {
        // Configure BASE_URL for this agency
        const apiUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
        console.log(`🔄 ${agencySlug}: configuration BASE_URL...`);
        setApiBaseUrl(apiUrl);
        
        // Clear DataService cache to force fresh load
        DataService.clearCache();
        
        // Load data for this agency
        const loadedData = await DataService.loadAllData(true);
        const data = {
          users: loadedData.users || [],
          clients: loadedData.clients || [],
          projects: loadedData.projects || [],
          interventions: loadedData.interventions || [],
          factures: loadedData.factures || [],
          devis: loadedData.devis || [],
        };

        console.log(`✅ ${agencySlug}: ${data.factures.length} factures, ${data.projects.length} projets, ${data.interventions.length} interventions`);

        // Cache the data
        dataCache.set(cacheKey, { data, timestamp: Date.now() });
        
        results.push({ agencyId: agencySlug, data });
      } catch (error) {
        console.error(`❌ ${agencySlug}: échec chargement`, error);
        results.push({ agencyId: agencySlug, data: null, error });
      }
    }

    console.log(`✅ Chargement terminé: ${results.filter(r => r.data).length}/${agencySlugs.length} agences OK`);
    return results.filter(r => r.data);
  }

  /**
   * Aggregate CA across multiple agencies
   */
  static aggregateCA(agencyData: any[]): number {
    return agencyData.reduce((sum, agency) => {
      if (!agency.data?.factures) return sum;
      const agencyCA = agency.data.factures
        .filter((f: any) => f.type === 'facture')
        .reduce((total: number, f: any) => total + (f.montantHT || 0), 0);
      return sum + agencyCA;
    }, 0);
  }

  /**
   * Aggregate project count across multiple agencies
   */
  static aggregateProjectCount(agencyData: any[]): number {
    return agencyData.reduce((sum, agency) => {
      if (!agency.data?.projects) return sum;
      return sum + agency.data.projects.length;
    }, 0);
  }

  /**
   * Calculate weighted average rate
   */
  static calculateWeightedAverage(agencyData: any[], getValue: (data: any) => number, getWeight: (data: any) => number): number {
    let totalWeightedValue = 0;
    let totalWeight = 0;

    agencyData.forEach(agency => {
      if (!agency.data) return;
      const value = getValue(agency.data);
      const weight = getWeight(agency.data);
      totalWeightedValue += value * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalWeightedValue / totalWeight : 0;
  }

  /**
   * Clear cache for specific agency or all agencies
   */
  static clearCache(agencyId?: string) {
    if (agencyId) {
      for (const key of dataCache.keys()) {
        if (key.startsWith(agencyId)) {
          dataCache.delete(key);
        }
      }
    } else {
      dataCache.clear();
    }
  }
}
