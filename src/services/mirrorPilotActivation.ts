/**
 * Mirror Pilot Activation — Pre-activation validation & decision journal
 * 
 * Provides canActivateMirrorPilot() to validate readiness before activation,
 * and logMirrorDecision() to persist source decisions for observability.
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';
import { isMirrorFreshEnough, type ModuleKey, type ResolvedSource } from './mirrorDataSource';
import { getMirrorRecordCount } from './mirrorReadAdapter';
import { getLastComparisonResults, type MirrorQualityResult } from './mirrorValidation';

// ============================================================
// 1. PRE-ACTIVATION VALIDATION
// ============================================================

export interface ActivationCheckResult {
  canActivate: boolean;
  checks: {
    lastSyncSucceeded: boolean;
    freshnessOk: boolean;
    volumeNonZero: boolean;
    noBlockingAnomaly: boolean;
    invalidRatioOk: boolean;
  };
  reason?: string;
  details: Record<string, unknown>;
}

/**
 * Full pre-activation checklist for a pilot module on a specific agency.
 * Returns whether it's safe to switch the module to fallback/mirror.
 */
export async function canActivateMirrorPilot(
  moduleKey: ModuleKey,
  agencyId: string,
  thresholdMinutes = 480,
): Promise<ActivationCheckResult> {
  const details: Record<string, unknown> = { moduleKey, agencyId, thresholdMinutes };

  // 1. Freshness + last sync status
  const freshness = await isMirrorFreshEnough(moduleKey, agencyId, thresholdMinutes);
  details.freshness = freshness;

  const lastSyncSucceeded = freshness.reason !== 'last_sync_failed' && freshness.reason !== 'sync_status_unavailable';
  const freshnessOk = freshness.fresh;

  // 2. Volume check
  const count = await getMirrorRecordCount(moduleKey, agencyId);
  details.mirrorCount = count;
  const volumeNonZero = count > 0;

  // 3. Recent comparisons — check for blocking anomalies
  const comparisons = getLastComparisonResults()
    .filter(c => c.module === moduleKey && c.agencyId === agencyId);
  const recentFailed = comparisons.filter(c => !c.passed);
  details.recentComparisons = comparisons.length;
  details.recentFailed = recentFailed.length;
  const noBlockingAnomaly = recentFailed.length === 0;

  // 4. Invalid ratio — if we have comparisons, check field integrity
  const invalidRatioOk = comparisons.length === 0 || 
    comparisons.every(c => c.missingRequiredFields === 0);

  const canActivate = lastSyncSucceeded && freshnessOk && volumeNonZero && noBlockingAnomaly && invalidRatioOk;

  const reasons: string[] = [];
  if (!lastSyncSucceeded) reasons.push('last_sync_not_succeeded');
  if (!freshnessOk) reasons.push(`stale_data: ${freshness.reason}`);
  if (!volumeNonZero) reasons.push('mirror_empty');
  if (!noBlockingAnomaly) reasons.push(`${recentFailed.length}_failed_comparisons`);
  if (!invalidRatioOk) reasons.push('missing_required_fields');

  return {
    canActivate,
    checks: { lastSyncSucceeded, freshnessOk, volumeNonZero, noBlockingAnomaly, invalidRatioOk },
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
    details,
  };
}

// ============================================================
// 2. DECISION JOURNAL — persistent logging
// ============================================================

// Batch decisions to avoid spamming inserts
let decisionBuffer: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 10_000; // 10 seconds
const MAX_BUFFER = 50;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushDecisions, FLUSH_INTERVAL);
}

async function flushDecisions() {
  flushTimer = null;
  if (decisionBuffer.length === 0) return;

  const batch = decisionBuffer.splice(0, MAX_BUFFER);
  try {
    await supabase.from('mirror_decision_log' as any).insert(batch);
  } catch (err) {
    logApogee.warn('[MirrorDecision] Failed to flush decision log:', err);
    // Don't re-add — log and move on to avoid growing buffer
  }
}

/**
 * Log a mirror source decision to the persistent journal.
 * Batched and non-blocking — never impacts response time.
 */
export function logMirrorDecision(
  moduleKey: ModuleKey,
  agencyId: string | null,
  resolved: ResolvedSource,
  itemCount?: number,
  qualityResult?: MirrorQualityResult,
): void {
  // Only log non-live decisions or fallback events to avoid spam
  if (resolved.effectiveSource === 'live' && resolved.mode === 'live') return;

  decisionBuffer.push({
    module_key: moduleKey,
    agency_id: agencyId,
    mode_requested: resolved.mode,
    source_used: resolved.effectiveSource,
    fallback_reason: resolved.fallbackReason || null,
    freshness_minutes: resolved.freshnessMinutes ?? null,
    item_count: itemCount ?? null,
    quality_check: qualityResult ? JSON.parse(JSON.stringify(qualityResult)) : null,
  });

  scheduleFlush();
}

// ============================================================
// 3. PILOT METRICS — in-memory counters for admin
// ============================================================

export interface PilotMetrics {
  liveReads: number;
  mirrorReads: number;
  fallbackToLive: number;
  fallbackReasons: Record<string, number>;
  totalItems: number;
  lastActivity: string | null;
}

const metricsStore: Record<string, PilotMetrics> = {};

function getOrCreateMetrics(moduleKey: string): PilotMetrics {
  if (!metricsStore[moduleKey]) {
    metricsStore[moduleKey] = {
      liveReads: 0,
      mirrorReads: 0,
      fallbackToLive: 0,
      fallbackReasons: {},
      totalItems: 0,
      lastActivity: null,
    };
  }
  return metricsStore[moduleKey];
}

/**
 * Record a source resolution for metrics.
 */
export function recordMetric(
  moduleKey: ModuleKey,
  resolved: ResolvedSource,
  itemCount: number,
): void {
  const m = getOrCreateMetrics(moduleKey);
  m.lastActivity = new Date().toISOString();
  m.totalItems += itemCount;

  if (resolved.effectiveSource === 'mirror') {
    m.mirrorReads++;
  } else if (resolved.mode !== 'live' && resolved.effectiveSource === 'live') {
    // Was supposed to be mirror/fallback but ended up live
    m.fallbackToLive++;
    if (resolved.fallbackReason) {
      m.fallbackReasons[resolved.fallbackReason] = (m.fallbackReasons[resolved.fallbackReason] || 0) + 1;
    }
  } else {
    m.liveReads++;
  }
}

/**
 * Get current pilot metrics for admin dashboard.
 */
export function getPilotMetrics(): Record<string, PilotMetrics> {
  return { ...metricsStore };
}

/**
 * Reset metrics (for testing).
 */
export function resetPilotMetrics(): void {
  Object.keys(metricsStore).forEach(k => delete metricsStore[k]);
}

// ============================================================
// 4. SUCCESS CRITERIA
// ============================================================

export const PILOT_SUCCESS_CRITERIA = {
  users: {
    minDuration: '48h–7 jours sans anomalie',
    maxFallbackRatio: 0.1, // <10% fallback
    maxDeltaPct: 5, // <5% écart volume live vs miroir
    noRepeatedFailedComparisons: true,
    noUserComplaints: true,
  },
  projects: {
    minDuration: '48h–7 jours après succès users',
    maxFallbackRatio: 0.1,
    maxDeltaPct: 5,
    noRepeatedFailedComparisons: true,
    noUserComplaints: true,
  },
  factures: {
    minDuration: '7 jours après succès projects',
    maxFallbackRatio: 0.05, // stricter for financial data
    maxDeltaPct: 2,
    noRepeatedFailedComparisons: true,
    noUserComplaints: true,
  },
} as const;

/**
 * Evaluate if the current pilot metrics meet success criteria.
 */
export function evaluatePilotSuccess(moduleKey: 'users' | 'projects' | 'factures'): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  const m = metricsStore[moduleKey];
  if (!m) return { passed: false, details: { reason: 'no_metrics_collected' } };

  const criteria = PILOT_SUCCESS_CRITERIA[moduleKey];
  const totalReads = m.mirrorReads + m.fallbackToLive + m.liveReads;
  const fallbackRatio = totalReads > 0 ? m.fallbackToLive / totalReads : 0;

  const comparisons = getLastComparisonResults().filter(c => c.module === moduleKey);
  const failedComparisons = comparisons.filter(c => !c.passed);

  const passed = fallbackRatio <= criteria.maxFallbackRatio &&
    failedComparisons.length === 0;

  return {
    passed,
    details: {
      totalReads,
      mirrorReads: m.mirrorReads,
      fallbackToLive: m.fallbackToLive,
      fallbackRatio: Math.round(fallbackRatio * 100) / 100,
      maxFallbackRatio: criteria.maxFallbackRatio,
      failedComparisons: failedComparisons.length,
      topFallbackReasons: Object.entries(m.fallbackReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    },
  };
}
