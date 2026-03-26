/**
 * Mirror Data Source Resolution Layer
 * 
 * Decides whether to read from live API or mirror tables per module/agency.
 * Handles fallback logic and freshness validation.
 * 
 * IMPORTANT: This layer is purely additive. It does NOT replace existing calls.
 * It is consumed only by the mirror-aware adapter.
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';

// ============================================================
// TYPES
// ============================================================

export type SourceMode = 'live' | 'mirror' | 'fallback';

export type ModuleKey = 'factures' | 'projects' | 'interventions' | 'devis' | 'users' | 'clients';

export interface ResolvedSource {
  mode: SourceMode;
  effectiveSource: 'live' | 'mirror';
  fallbackReason?: string;
  freshnessMinutes?: number;
  thresholdMinutes: number;
}

interface FlagRow {
  module_key: string;
  source_mode: string;
  agency_id: string | null;
  is_enabled: boolean;
  freshness_threshold_minutes: number;
}

// ============================================================
// FLAG CACHE (in-memory, short TTL to avoid stale config)
// ============================================================

let flagsCache: FlagRow[] | null = null;
let flagsCacheTime = 0;
const FLAGS_CACHE_TTL = 60_000; // 1 minute

async function loadFlags(): Promise<FlagRow[]> {
  const now = Date.now();
  if (flagsCache && (now - flagsCacheTime) < FLAGS_CACHE_TTL) {
    return flagsCache;
  }

  const { data, error } = await supabase
    .from('data_source_flags')
    .select('module_key, source_mode, agency_id, is_enabled, freshness_threshold_minutes')
    .eq('is_enabled', true);

  if (error) {
    logApogee.warn('[MirrorResolver] Failed to load flags, defaulting to live:', error.message);
    return [];
  }

  flagsCache = (data || []) as FlagRow[];
  flagsCacheTime = now;
  return flagsCache;
}

/** Force-refresh the flags cache (e.g. after admin change) */
export function invalidateFlagsCache(): void {
  flagsCache = null;
  flagsCacheTime = 0;
}

// ============================================================
// RESOLUTION
// ============================================================

/**
 * Resolve which source mode applies for a given module + agency.
 * Priority: agency-specific flag > global flag > 'live' default.
 */
export async function resolveDataSourceMode(
  moduleKey: ModuleKey,
  agencyId: string | null,
): Promise<{ mode: SourceMode; thresholdMinutes: number }> {
  const flags = await loadFlags();

  // 1. Agency-specific flag
  if (agencyId) {
    const agencyFlag = flags.find(f => f.module_key === moduleKey && f.agency_id === agencyId);
    if (agencyFlag) {
      return {
        mode: agencyFlag.source_mode as SourceMode,
        thresholdMinutes: agencyFlag.freshness_threshold_minutes,
      };
    }
  }

  // 2. Global flag (agency_id IS NULL)
  const globalFlag = flags.find(f => f.module_key === moduleKey && f.agency_id === null);
  if (globalFlag) {
    return {
      mode: globalFlag.source_mode as SourceMode,
      thresholdMinutes: globalFlag.freshness_threshold_minutes,
    };
  }

  // 3. Default
  return { mode: 'live', thresholdMinutes: 240 };
}

/**
 * Check if mirror data is fresh enough for a given module/agency.
 */
export async function isMirrorFreshEnough(
  moduleKey: ModuleKey,
  agencyId: string,
  thresholdMinutes: number,
): Promise<{ fresh: boolean; freshnessMinutes: number | null; reason?: string }> {
  // Query the sync status view for this agency
  const { data, error } = await supabase
    .from('apogee_sync_status' as any)
    .select('freshness_minutes, freshness_status, last_status')
    .eq('agency_id', agencyId)
    .maybeSingle() as { data: { freshness_minutes: number | null; freshness_status: string; last_status: string } | null; error: any };

  if (error || !data) {
    return { fresh: false, freshnessMinutes: null, reason: 'sync_status_unavailable' };
  }

  const freshnessMinutes = data.freshness_minutes;

  if (freshnessMinutes === null) {
    return { fresh: false, freshnessMinutes: null, reason: 'never_synced' };
  }

  if (data.last_status === 'failed') {
    return { fresh: false, freshnessMinutes, reason: 'last_sync_failed' };
  }

  if (freshnessMinutes > thresholdMinutes) {
    return { fresh: false, freshnessMinutes, reason: `stale_${Math.round(freshnessMinutes)}min_threshold_${thresholdMinutes}min` };
  }

  // Check that the specific mirror table has data
  const tableName = `${moduleKey}_mirror`;
  const { count, error: countErr } = await supabase
    .from(tableName as any)
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('mirror_status', 'synced') as { count: number | null; error: any };

  if (countErr || (count ?? 0) === 0) {
    return { fresh: false, freshnessMinutes, reason: 'mirror_table_empty' };
  }

  return { fresh: true, freshnessMinutes };
}

/**
 * Full resolution: decide effective source with fallback logic.
 * Returns the resolved source and logging metadata.
 */
export async function resolveEffectiveSource(
  moduleKey: ModuleKey,
  agencyId: string | null,
): Promise<ResolvedSource> {
  const { mode, thresholdMinutes } = await resolveDataSourceMode(moduleKey, agencyId);

  // Fast path: live mode
  if (mode === 'live') {
    return { mode, effectiveSource: 'live', thresholdMinutes };
  }

  // Mirror or fallback: check freshness
  if (!agencyId) {
    return { mode, effectiveSource: 'live', fallbackReason: 'no_agency_id', thresholdMinutes };
  }

  const freshness = await isMirrorFreshEnough(moduleKey, agencyId, thresholdMinutes);

  if (mode === 'mirror') {
    // Mirror mode: use mirror regardless (caller must handle stale data)
    return {
      mode,
      effectiveSource: freshness.fresh ? 'mirror' : 'mirror', // still mirror, but log staleness
      freshnessMinutes: freshness.freshnessMinutes ?? undefined,
      fallbackReason: freshness.fresh ? undefined : freshness.reason,
      thresholdMinutes,
    };
  }

  // Fallback mode: prefer mirror, fall back to live if stale
  if (freshness.fresh) {
    return {
      mode,
      effectiveSource: 'mirror',
      freshnessMinutes: freshness.freshnessMinutes ?? undefined,
      thresholdMinutes,
    };
  }

  return {
    mode,
    effectiveSource: 'live',
    fallbackReason: freshness.reason,
    freshnessMinutes: freshness.freshnessMinutes ?? undefined,
    thresholdMinutes,
  };
}

/**
 * Convenience: should this module use mirror data?
 */
export async function shouldUseMirror(moduleKey: ModuleKey, agencyId: string | null): Promise<boolean> {
  const resolved = await resolveEffectiveSource(moduleKey, agencyId);
  return resolved.effectiveSource === 'mirror';
}

/**
 * Log a source resolution decision (discrete, no secrets, no spam).
 */
export function logSourceResolution(
  moduleKey: ModuleKey,
  agencyId: string | null,
  resolved: ResolvedSource,
  itemCount?: number,
): void {
  const parts = [
    `[DataSource] ${moduleKey}`,
    `agency=${agencyId ?? 'global'}`,
    `mode=${resolved.mode}`,
    `effective=${resolved.effectiveSource}`,
  ];

  if (resolved.freshnessMinutes !== undefined) {
    parts.push(`freshness=${Math.round(resolved.freshnessMinutes)}min`);
  }
  if (resolved.fallbackReason) {
    parts.push(`fallback=${resolved.fallbackReason}`);
  }
  if (itemCount !== undefined) {
    parts.push(`items=${itemCount}`);
  }

  logApogee.debug(parts.join(' | '));
}
