import { DataService } from '@/apogee-connect/services/dataService';
import { setApiBaseUrl } from '@/apogee-connect/services/api';
import { DateRange } from '../contexts/NetworkFiltersContext';
import { parseISO, parse, isWithinInterval } from 'date-fns';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const dataCache = new Map<string, CacheEntry>();

export class NetworkDataService {
  /**
   * Load data for a single agency
   * Must be called SEQUENTIALLY to avoid BASE_URL race condition
   */
  static async loadAgencyData(agencySlug: string) {
    try {
      // Configure BASE_URL for this agency
      const apiUrl = `https://${agencySlug}.hc-apogee.fr/api/`;
      setApiBaseUrl(apiUrl);
      
      // Clear DataService cache to force fresh load
      DataService.clearCache();
      
      // Load data for this agency
      const loadedData: any = await DataService.loadAllData(true);
      return {
        users: loadedData.users || [],
        clients: loadedData.clients || [],
        projects: loadedData.projects || [],
        interventions: loadedData.interventions || [],
        factures: loadedData.invoices || loadedData.factures || [],
        devis: loadedData.quotes || loadedData.devis || [],
      };
    } catch (error) {
      console.error(`❌ Error loading ${agencySlug}:`, error);
      return null;
    }
  }

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
        const loadedData: any = await DataService.loadAllData(true);
        const data = {
          users: loadedData.users || [],
          clients: loadedData.clients || [],
          projects: loadedData.projects || [],
          interventions: loadedData.interventions || [],
          // Harmonisation des noms: les données API peuvent utiliser invoices/quotes
          factures: loadedData.invoices || loadedData.factures || [],
          devis: loadedData.quotes || loadedData.devis || [],
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
   * Aggregate CA across multiple agencies for a given date range
   */
  static aggregateCA(agencyData: any[], range: { start: Date; end: Date }): number {
    const parseDate = (value: string): Date | null => {
      if (!value) return null;
      try {
        const d = parseISO(value);
        if (!isNaN(d.getTime())) return d;
      } catch {}
      try {
        const d = parse(value, 'dd/MM/yyyy', new Date());
        if (!isNaN(d.getTime())) return d;
      } catch {}
      return null;
    };

    return agencyData.reduce((sum, agency) => {
      if (!agency.data?.factures) return sum;
      const agencyCA = agency.data.factures
        .filter((f: any) => f.type !== 'avoir')
        .reduce((total: number, f: any) => {
          const dateStr = f.dateReelle || f.dateEmission || f.created_at;
          const d = dateStr ? parseDate(dateStr) : null;
          if (!d || !isWithinInterval(d, range)) return total;

          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          return total + montant;
        }, 0);
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
