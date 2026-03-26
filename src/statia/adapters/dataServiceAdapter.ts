/**
 * StatIA Phase 2 - DataService Adapter (with Mirror Support)
 * Bridge entre DataService existant et ApogeeDataServices de StatIA
 * 
 * LOT 3: Transparent mirror read interception.
 * LOT 3.1: Typed mappers, quality guards, silent comparison.
 * 
 * IMPORTANT: The live path is UNCHANGED. Mirror logic is purely additive.
 * All modules default to 'live' mode via data_source_flags table.
 */

import { DataService, CachedData } from '@/apogee-connect/services/dataService';
import { ApogeeDataServices } from '../engine/loaders';
import { DateRange } from '../definitions/types';
import { logApogee } from '@/lib/logger';
import {
  resolveEffectiveSource,
  logSourceResolution,
  type ModuleKey,
  type ResolvedSource,
} from '@/services/mirrorDataSource';
import { readMirrorData } from '@/services/mirrorReadAdapter';
import { mapMirrorRecords, runSilentComparison, isMirrorUsableForModule } from '@/services/mirrorValidation';
import { logMirrorDecision, recordMetric, maybePersistSnapshot } from '@/services/mirrorPilotActivation';

// ============================================================
// AGENCY ID RESOLUTION HELPER
// ============================================================

/**
 * Try to resolve agency UUID from slug.
 * Uses profiles table as source of truth.
 * Returns null if not resolvable (live path will be used).
 */
let agencyIdCache: Record<string, string> = {};

async function resolveAgencyId(agencySlug: string): Promise<string | null> {
  if (agencyIdCache[agencySlug]) return agencyIdCache[agencySlug];
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('apogee_agencies')
      .select('id')
      .eq('slug', agencySlug)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data?.id) {
      agencyIdCache[agencySlug] = data.id;
      return data.id;
    }
  } catch {
    // Silent fail — live path will be used
  }
  return null;
}

// ============================================================
// MIRROR-AWARE DATA LOADER
// ============================================================

/**
 * Wraps a live data loader with mirror resolution.
 * If mirror is active and fresh, returns mirror data.
 * Otherwise, falls back to the original live loader.
 */
async function withMirrorResolution(
  moduleKey: ModuleKey,
  agencySlug: string,
  liveFn: () => Promise<unknown[]>,
): Promise<unknown[]> {
  // Resolve agency UUID
  const agencyId = await resolveAgencyId(agencySlug);
  
  // Resolve source mode
  let resolved: ResolvedSource;
  try {
    resolved = await resolveEffectiveSource(moduleKey, agencyId);
  } catch {
    // If resolution fails, default to live
    return liveFn();
  }

  // Fast path: live mode (most common case, zero overhead)
  if (resolved.effectiveSource === 'live') {
    // Log when mode is not 'live' (i.e. fallback resolved to live)
    if (resolved.mode !== 'live') {
      logSourceResolution(moduleKey, agencyId, resolved);
      recordMetric(moduleKey, resolved, 0);
      logMirrorDecision(moduleKey, agencyId, resolved);
    }
    return liveFn();
  }

  // Mirror path
  try {
    if (!agencyId) {
      return liveFn();
    }

    // Quality guard: check if mirror is actually usable
    const quality = await isMirrorUsableForModule(moduleKey, agencyId, resolved.thresholdMinutes);
    if (!quality.usable && resolved.mode === 'fallback') {
      const fallbackResolved = { ...resolved, effectiveSource: 'live' as const, fallbackReason: quality.reason || 'quality_check_failed' };
      logSourceResolution(moduleKey, agencyId, fallbackResolved);
      return liveFn();
    }

    const rawMirrorData = await readMirrorData(moduleKey, agencyId);
    
    if (rawMirrorData.length === 0 && resolved.mode === 'fallback') {
      const fallbackResolved = { ...resolved, effectiveSource: 'live' as const, fallbackReason: 'mirror_empty' };
      logSourceResolution(moduleKey, agencyId, fallbackResolved);
      return liveFn();
    }

    // Apply typed mappers — filters out invalid records
    const mappedData = mapMirrorRecords(moduleKey, rawMirrorData);

    // Silent comparison (sampled, async, non-blocking)
    runSilentComparison(moduleKey, agencyId, mappedData, liveFn);

    logSourceResolution(moduleKey, agencyId, resolved, mappedData.length);
    recordMetric(moduleKey, resolved, mappedData.length);
    logMirrorDecision(moduleKey, agencyId, resolved, mappedData.length, quality);
    // Periodic snapshot persistence (non-blocking)
    if (agencyId) maybePersistSnapshot(moduleKey, agencyId).catch(() => {});
    return mappedData;
  } catch (err) {
    // If mirror read fails, fallback to live
    logApogee.warn(`[MirrorAdapter] ${moduleKey} mirror read failed, falling back to live:`, err);
    return liveFn();
  }
}

// ============================================================
// ADAPTER (ORIGINAL LOGIC PRESERVED + MIRROR INTERCEPTION)
// ============================================================

/**
 * Crée une instance ApogeeDataServices compatible avec StatIA
 * à partir du DataService existant, with optional mirror interception.
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
      return withMirrorResolution('factures', agencySlug, async () => {
        const data = await loadDataIfNeeded(agencySlug);
        return data.factures || [];
      });
    },
    
    getDevis: async (agencySlug: string, _dateRange: DateRange) => {
      return withMirrorResolution('devis', agencySlug, async () => {
        const data = await loadDataIfNeeded(agencySlug);
        return data.devis || [];
      });
    },
    
    getInterventions: async (agencySlug: string, _dateRange: DateRange) => {
      return withMirrorResolution('interventions', agencySlug, async () => {
        const data = await loadDataIfNeeded(agencySlug);
        return data.interventions || [];
      });
    },
    
    getProjects: async (agencySlug: string, _dateRange: DateRange) => {
      return withMirrorResolution('projects', agencySlug, async () => {
        const data = await loadDataIfNeeded(agencySlug);
        return data.projects || [];
      });
    },
    
    getUsers: async (agencySlug: string) => {
      return withMirrorResolution('users', agencySlug, async () => {
        const data = await loadDataIfNeeded(agencySlug);
        return data.users || [];
      });
    },
    
    getClients: async (agencySlug: string) => {
      return withMirrorResolution('clients', agencySlug, async () => {
        const data = await loadDataIfNeeded(agencySlug);
        return data.clients || [];
      });
    },

    getCreneaux: async (agencySlug: string) => {
      // Creneaux are NOT in mirror tables — always live
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
  agencyIdCache = {};
}
