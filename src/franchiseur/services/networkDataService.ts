import { DataService } from '@/apogee-connect/services/dataService';
import { DateRange } from '../contexts/NetworkFiltersContext';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const dataCache = new Map<string, CacheEntry>();

export class NetworkDataService {
  /**
   * Load data for multiple agencies in parallel
   */
  static async loadMultiAgencyData(agencyIds: string[], dateRange?: DateRange) {
    const results = await Promise.allSettled(
      agencyIds.map(async (agencyId) => {
        const cacheKey = `${agencyId}-${dateRange?.from.toISOString()}-${dateRange?.to.toISOString()}`;
        
        // Check cache
        const cached = dataCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return { agencyId, data: cached.data };
        }

        // Load fresh data
        try {
          const loadedData = await DataService.loadAllData(true);
          const data = {
            users: loadedData.users || [],
            clients: loadedData.clients || [],
            projects: loadedData.projects || [],
            interventions: loadedData.interventions || [],
            factures: loadedData.factures || [],
            devis: loadedData.devis || [],
          };

          // Cache the data
          dataCache.set(cacheKey, { data, timestamp: Date.now() });
          
          return { agencyId, data };
        } catch (error) {
          console.error(`Failed to load data for agency ${agencyId}:`, error);
          return { agencyId, data: null, error };
        }
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);
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
