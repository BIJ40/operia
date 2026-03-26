/**
 * Mirror Pilot Activation — Pre-activation validation, decision journal,
 * persisted metrics snapshots, and projects readiness checkpoint.
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';
import { isMirrorFreshEnough, type ModuleKey, type ResolvedSource } from './mirrorDataSource';
import { getMirrorRecordCount } from './mirrorReadAdapter';
import { getLastComparisonResults, type ComparisonResult, type MirrorQualityResult } from './mirrorValidation';

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

export async function canActivateMirrorPilot(
  moduleKey: ModuleKey,
  agencyId: string,
  thresholdMinutes = 480,
): Promise<ActivationCheckResult> {
  const details: Record<string, unknown> = { moduleKey, agencyId, thresholdMinutes };

  const freshness = await isMirrorFreshEnough(moduleKey, agencyId, thresholdMinutes);
  details.freshness = freshness;

  const lastSyncSucceeded = freshness.reason !== 'last_sync_failed' && freshness.reason !== 'sync_status_unavailable';
  const freshnessOk = freshness.fresh;

  const count = await getMirrorRecordCount(moduleKey, agencyId);
  details.mirrorCount = count;
  const volumeNonZero = count > 0;

  const comparisons = getLastComparisonResults()
    .filter(c => c.module === moduleKey && c.agencyId === agencyId);
  const recentFailed = comparisons.filter(c => !c.passed);
  details.recentComparisons = comparisons.length;
  details.recentFailed = recentFailed.length;
  const noBlockingAnomaly = recentFailed.length === 0;

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

let decisionBuffer: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 10_000;
const MAX_BUFFER = 50;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushDecisions, FLUSH_INTERVAL);
}

/** Flush all buffered decisions to DB immediately. Exported for validation reads. */
export async function flushDecisions() {
  flushTimer = null;
  if (decisionBuffer.length === 0) return;

  const batch = decisionBuffer.splice(0, MAX_BUFFER);
  try {
    await supabase.from('mirror_decision_log' as any).insert(batch);
  } catch (err) {
    logApogee.warn('[MirrorDecision] Failed to flush decision log:', err);
  }
}

export function logMirrorDecision(
  moduleKey: ModuleKey,
  agencyId: string | null,
  resolved: ResolvedSource,
  itemCount?: number,
  qualityResult?: MirrorQualityResult,
): void {
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
// 3. PILOT METRICS — in-memory counters + periodic persistence
// ============================================================

export interface PilotMetrics {
  liveReads: number;
  mirrorReads: number;
  fallbackToLive: number;
  fallbackReasons: Record<string, number>;
  totalItems: number;
  lastActivity: string | null;
  comparisonsTotal: number;
  comparisonsPassed: number;
  comparisonsFailed: number;
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
      comparisonsTotal: 0,
      comparisonsPassed: 0,
      comparisonsFailed: 0,
    };
  }
  return metricsStore[moduleKey];
}

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
    m.fallbackToLive++;
    if (resolved.fallbackReason) {
      m.fallbackReasons[resolved.fallbackReason] = (m.fallbackReasons[resolved.fallbackReason] || 0) + 1;
    }
  } else {
    m.liveReads++;
  }
}

/** Record a comparison result in metrics */
export function recordComparisonMetric(moduleKey: ModuleKey, passed: boolean): void {
  const m = getOrCreateMetrics(moduleKey);
  m.comparisonsTotal++;
  if (passed) m.comparisonsPassed++;
  else m.comparisonsFailed++;
}

export function getPilotMetrics(): Record<string, PilotMetrics> {
  return { ...metricsStore };
}

export function resetPilotMetrics(): void {
  Object.keys(metricsStore).forEach(k => delete metricsStore[k]);
}

// ============================================================
// 3b. SNAPSHOT PERSISTENCE — survives restarts
// ============================================================

let lastSnapshotTime = 0;
const SNAPSHOT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Persist current in-memory metrics to mirror_pilot_snapshots.
 * Called periodically from the adapter, non-blocking.
 */
export async function maybePersistSnapshot(
  moduleKey: ModuleKey,
  agencyId: string,
  force = false,
): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSnapshotTime < SNAPSHOT_INTERVAL) return;
  lastSnapshotTime = now;

  const m = metricsStore[moduleKey];
  if (!m) return;

  const comparisons = getLastComparisonResults().filter(
    c => c.module === moduleKey && c.agencyId === agencyId
  );
  const { verdict, reasons } = computePilotVerdictFromMetrics(m, comparisons, moduleKey);

  // Freshness
  let lastFreshness: number | null = null;
  try {
    const fr = await isMirrorFreshEnough(moduleKey, agencyId, 480);
    lastFreshness = fr.freshnessMinutes;
  } catch { /* silent */ }

  let lastMirrorCount: number | null = null;
  try {
    lastMirrorCount = await getMirrorRecordCount(moduleKey, agencyId);
  } catch { /* silent */ }

  try {
    await supabase.from('mirror_pilot_snapshots' as any).insert({
      module_key: moduleKey,
      agency_id: agencyId,
      mirror_reads: m.mirrorReads,
      live_reads: m.liveReads,
      fallback_to_live: m.fallbackToLive,
      fallback_reasons: m.fallbackReasons,
      total_items: m.totalItems,
      comparisons_total: m.comparisonsTotal,
      comparisons_passed: m.comparisonsPassed,
      comparisons_failed: m.comparisonsFailed,
      last_freshness_minutes: lastFreshness,
      last_mirror_count: lastMirrorCount,
      verdict,
      verdict_reasons: reasons,
    });
  } catch (err) {
    logApogee.warn('[MirrorSnapshot] Failed to persist snapshot:', err);
  }
}

/**
 * Load the most recent persisted snapshots for the admin panel.
 */
export async function loadPersistedSnapshots(
  moduleKey: string,
  agencyId: string,
  limit = 50,
): Promise<unknown[]> {
  const { data } = await supabase
    .from('mirror_pilot_snapshots' as any)
    .select('*')
    .eq('module_key', moduleKey)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit) as any;
  return data || [];
}

// ============================================================
// 4. VERDICT — can work from memory OR persisted data
// ============================================================

export type PilotVerdict = 'stable' | 'à surveiller' | 'rollback conseillé' | 'inactif';

export function computePilotVerdictFromMetrics(
  m: PilotMetrics | undefined,
  comparisons: ComparisonResult[],
  moduleKey: string,
): { verdict: PilotVerdict; reasons: string[] } {
  if (!m || (m.mirrorReads === 0 && m.fallbackToLive === 0)) {
    return { verdict: 'inactif', reasons: ['Aucune lecture miroir/fallback enregistrée'] };
  }

  const totalNonPureLive = m.mirrorReads + m.fallbackToLive;
  if (totalNonPureLive === 0) return { verdict: 'inactif', reasons: ['Aucune lecture miroir/fallback'] };

  const fallbackRatio = m.fallbackToLive / totalNonPureLive;
  const reasons: string[] = [];
  let verdict: PilotVerdict = 'stable';

  if (fallbackRatio > 0.5) {
    verdict = 'rollback conseillé';
    reasons.push(`Fallback ratio ${Math.round(fallbackRatio * 100)}% > 50%`);
  } else if (fallbackRatio > 0.2) {
    verdict = 'à surveiller';
    reasons.push(`Fallback ratio ${Math.round(fallbackRatio * 100)}% > 20%`);
  }

  const moduleCmps = comparisons.filter(c => c.module === moduleKey);
  const recentFailed = moduleCmps.filter(c => !c.passed);
  if (recentFailed.length >= 2) {
    verdict = 'rollback conseillé';
    reasons.push(`${recentFailed.length} comparaisons échouées`);
  }

  const lastCmp = moduleCmps[0];
  if (lastCmp && Math.abs(lastCmp.countDeltaPct) > 15) {
    if (verdict !== 'rollback conseillé') verdict = 'à surveiller';
    reasons.push(`Delta volume ${lastCmp.countDeltaPct}% > 15%`);
  }

  if (reasons.length === 0) reasons.push('Tous les indicateurs sont normaux');
  return { verdict, reasons };
}

// ============================================================
// 5. SUCCESS CRITERIA + PROJECTS READINESS
// ============================================================

export const PILOT_SUCCESS_CRITERIA = {
  users: {
    minDuration: '48h–7 jours sans anomalie',
    maxFallbackRatio: 0.1,
    maxDeltaPct: 5,
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
    maxFallbackRatio: 0.05,
    maxDeltaPct: 2,
    noRepeatedFailedComparisons: true,
    noUserComplaints: true,
  },
} as const;

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

// ============================================================
// 6. PROJECTS READINESS CHECKPOINT
// ============================================================

export type ReadinessSignal = 'green' | 'orange' | 'red';

export interface ProjectsReadiness {
  signal: ReadinessSignal;
  reasons: string[];
  checks: {
    usersPilotStable: boolean;
    usersPilotDuration: string;
    usersFallbackRatioOk: boolean;
    usersNoFailedComparisons: boolean;
    projectsMirrorHasData: boolean;
    projectsMirrorFresh: boolean;
    projectsMapperReady: boolean;
  };
}

/**
 * Evaluates if we're ready to activate `projects` in fallback.
 * Based on users pilot success + projects mirror readiness.
 */
export async function checkProjectsReadiness(
  daxAgencyId: string,
): Promise<ProjectsReadiness> {
  const reasons: string[] = [];

  // --- Users pilot status ---
  const usersM = metricsStore['users'];
  const usersComparisons = getLastComparisonResults().filter(c => c.module === 'users');
  const { verdict: usersVerdict } = computePilotVerdictFromMetrics(usersM, usersComparisons, 'users');

  const usersPilotStable = usersVerdict === 'stable';
  if (!usersPilotStable) reasons.push(`Pilote users: ${usersVerdict}`);

  // Check duration from persisted snapshots
  let usersPilotDuration = 'inconnu';
  try {
    const { data: oldest } = await supabase
      .from('mirror_pilot_snapshots' as any)
      .select('created_at')
      .eq('module_key', 'users')
      .eq('agency_id', daxAgencyId)
      .order('created_at', { ascending: true })
      .limit(1) as any;
    if (oldest?.[0]?.created_at) {
      const hours = Math.round((Date.now() - new Date(oldest[0].created_at).getTime()) / 3600000);
      usersPilotDuration = `${hours}h`;
      if (hours < 48) reasons.push(`Durée pilote users: ${hours}h < 48h minimum`);
    } else {
      reasons.push('Aucun snapshot persisté pour users');
    }
  } catch { reasons.push('Impossible de vérifier durée pilote users'); }

  // Fallback ratio
  const totalNonPureLive = (usersM?.mirrorReads ?? 0) + (usersM?.fallbackToLive ?? 0);
  const usersFallbackRatio = totalNonPureLive > 0 ? (usersM?.fallbackToLive ?? 0) / totalNonPureLive : 0;
  const usersFallbackRatioOk = usersFallbackRatio <= 0.1;
  if (!usersFallbackRatioOk) reasons.push(`Users fallback ratio: ${Math.round(usersFallbackRatio * 100)}% > 10%`);

  // Failed comparisons
  const usersFailedCmps = usersComparisons.filter(c => !c.passed);
  const usersNoFailedComparisons = usersFailedCmps.length === 0;
  if (!usersNoFailedComparisons) reasons.push(`${usersFailedCmps.length} comparaisons users échouées`);

  // --- Projects mirror readiness ---
  let projectsMirrorHasData = false;
  let projectsMirrorFresh = false;
  try {
    const count = await getMirrorRecordCount('projects' as ModuleKey, daxAgencyId);
    projectsMirrorHasData = count > 0;
    if (!projectsMirrorHasData) reasons.push('projects_mirror vide pour DAX');
  } catch { reasons.push('Impossible de vérifier projects_mirror'); }

  try {
    const fr = await isMirrorFreshEnough('projects' as ModuleKey, daxAgencyId, 480);
    projectsMirrorFresh = fr.fresh;
    if (!projectsMirrorFresh) reasons.push(`projects_mirror non frais: ${fr.reason}`);
  } catch { reasons.push('Impossible de vérifier fraîcheur projects'); }

  const projectsMapperReady = true; // mapMirrorProjectToAppShape exists

  // --- Signal ---
  const allOk = usersPilotStable && usersFallbackRatioOk && usersNoFailedComparisons
    && projectsMirrorHasData && projectsMirrorFresh && projectsMapperReady;
  const critical = !usersPilotStable || !projectsMirrorHasData;

  let signal: ReadinessSignal;
  if (allOk) signal = 'green';
  else if (critical) signal = 'red';
  else signal = 'orange';

  if (allOk) reasons.push('Tous les prérequis sont remplis');

  return {
    signal,
    reasons,
    checks: {
      usersPilotStable,
      usersPilotDuration,
      usersFallbackRatioOk,
      usersNoFailedComparisons,
      projectsMirrorHasData,
      projectsMirrorFresh,
      projectsMapperReady,
    },
  };
}
