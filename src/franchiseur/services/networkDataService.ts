/**
 * Service de chargement de données réseau multi-agences
 * Utilise le proxy sécurisé pour accéder à l'API Apogée
 */

import { apogeeProxy } from '@/services/apogeeProxy';
import { DateRange } from '../contexts/NetworkFiltersContext';
import { parseISO, parse, isWithinInterval } from 'date-fns';
import { logNetwork } from '@/lib/logger';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const dataCache = new Map<string, CacheEntry>();

export class NetworkDataService {
  /**
   * Load data for a single agency via secure proxy
   */
  static async loadAgencyData(agencySlug: string) {
    try {
      logNetwork.info(`Loading data for agency ${agencySlug} via secure proxy`);
      
      // Use secure proxy to load all data
      const loadedData = await apogeeProxy.getAllData(agencySlug);
      
      return {
        users: loadedData.users || [],
        clients: loadedData.clients || [],
        projects: loadedData.projects || [],
        interventions: loadedData.interventions || [],
        factures: loadedData.factures || [],
        devis: loadedData.devis || [],
      };
    } catch (error) {
      logNetwork.error(`Erreur chargement ${agencySlug}:`, error);
      return null;
    }
  }

  /**
   * Load data for multiple agencies via secure proxy
   * Uses parallel loading since proxy handles agency isolation
   */
  static async loadMultiAgencyData(agencySlugs: string[], dateRange?: DateRange) {
    const results = [];
    
    logNetwork.info(`Chargement de ${agencySlugs.length} agences via proxy sécurisé...`);
    
    // Load agencies in parallel - proxy handles isolation
    const loadPromises = agencySlugs.map(async (agencySlug) => {
      const cacheKey = `${agencySlug}-${dateRange?.from?.toISOString()}-${dateRange?.to?.toISOString()}`;
      
      // Check cache
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        logNetwork.debug(`${agencySlug}: données en cache`);
        return { agencyId: agencySlug, data: cached.data };
      }

      // Load fresh data via secure proxy
      try {
        logNetwork.debug(`${agencySlug}: chargement via proxy...`);
        
        const loadedData = await apogeeProxy.getAllData(agencySlug);
        const data = {
          users: loadedData.users || [],
          clients: loadedData.clients || [],
          projects: loadedData.projects || [],
          interventions: loadedData.interventions || [],
          factures: loadedData.factures || [],
          devis: loadedData.devis || [],
        };

        logNetwork.debug(`${agencySlug}: ${data.factures.length} factures, ${data.projects.length} projets, ${data.interventions.length} interventions`);

        // Cache the data
        dataCache.set(cacheKey, { data, timestamp: Date.now() });
        
        return { agencyId: agencySlug, data };
      } catch (error) {
        logNetwork.error(`${agencySlug}: échec chargement`, error);
        return { agencyId: agencySlug, data: null, error };
      }
    });

    const loadedResults = await Promise.all(loadPromises);
    
    for (const result of loadedResults) {
      if (result.data) {
        results.push(result);
      }
    }

    logNetwork.info(`Chargement terminé: ${results.length}/${agencySlugs.length} agences OK`);
    return results;
  }

  /**
   * Aggregate CA across multiple agencies for a given date range
   * IMPORTANT: Avoirs are treated as negative amounts per STATIA_RULES
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
        .reduce((total: number, f: any) => {
          const dateStr = f.dateReelle || f.dateEmission || f.created_at;
          const d = dateStr ? parseDate(dateStr) : null;
          if (!d || !isWithinInterval(d, range)) return total;

          const montantRaw = f.data?.totalHT || f.totalHT || f.montantHT || 0;
          const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, '')) || 0;
          
          // STATIA_RULES: Avoirs traités comme montants négatifs
          const typeFacture = (f.type || f.typeFacture || '').toLowerCase();
          const montantNet = typeFacture === 'avoir' ? -Math.abs(montant) : montant;
          return total + montantNet;
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
