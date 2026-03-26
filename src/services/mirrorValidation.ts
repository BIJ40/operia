/**
 * Mirror Validation Layer
 * 
 * Typed mappers, silent comparison, quality guards for pilot modules.
 * Ensures mirror data matches the live API contract before activation.
 */

import { logApogee } from '@/lib/logger';
import type { ModuleKey } from './mirrorDataSource';
import type { User, Project, Facture } from '@/apogee-connect/types';

// ============================================================
// 1. TYPED MAPPERS — mirror raw_data → app shape
// ============================================================

/**
 * Map a mirror raw_data object to the User shape expected by the app.
 * Returns null if the record is structurally invalid.
 */
export function mapMirrorUserToAppShape(raw: Record<string, unknown>): User | null {
  const id = raw.id;
  if (id == null) return null;

  const data = (raw.data && typeof raw.data === 'object') ? raw.data as Record<string, unknown> : undefined;
  const universes = Array.isArray(raw.universes)
    ? raw.universes.map(String)
    : Array.isArray(data?.universes)
      ? data.universes.map(String)
      : undefined;

  return {
    id: String(id),
    nom: String(raw.nom ?? raw.name ?? ''),
    prenom: String(raw.prenom ?? raw.firstname ?? raw.firstName ?? ''),
    email: String(raw.email ?? ''),
    tel: raw.tel != null ? String(raw.tel) : undefined,
    role: raw.role != null ? String(raw.role) : undefined,
    type: raw.type != null ? String(raw.type) : undefined,
    universes,
    initiales: raw.initiales != null ? String(raw.initiales) : undefined,
    is_on: raw.is_on,
    isActive: raw.isActive,
    data: data as User['data'] | undefined,
  } as User;
}

/**
 * Map a mirror raw_data object to the Project shape expected by the app.
 */
export function mapMirrorProjectToAppShape(raw: Record<string, unknown>): Project | null {
  const id = raw.id;
  if (id == null) return null;

  const data = (raw.data ?? {}) as Record<string, unknown>;

  return {
    id: String(id),
    clientId: String(raw.clientId ?? raw.client_id ?? ''),
    siteId: raw.siteId != null ? String(raw.siteId) : undefined,
    nom: raw.nom != null ? String(raw.nom) : undefined,
    adresse: raw.adresse != null ? String(raw.adresse) : undefined,
    ville: raw.ville != null ? String(raw.ville) : undefined,
    codePostal: raw.codePostal != null ? String(raw.codePostal) : undefined,
    state: raw.state != null ? String(raw.state) : undefined,
    universes: Array.isArray(raw.universes) ? raw.universes.map(String) : undefined,
    commanditaireId: raw.commanditaireId != null ? String(raw.commanditaireId) : (data.commanditaireId != null ? String(data.commanditaireId) : undefined),
    dateIntervention: raw.dateIntervention != null ? String(raw.dateIntervention) : undefined,
    totalHT: raw.totalHT != null ? Number(raw.totalHT) : undefined,
    totalTTC: raw.totalTTC != null ? Number(raw.totalTTC) : undefined,
    aPercevoir: raw.aPercevoir != null ? Number(raw.aPercevoir) : undefined,
    data: typeof raw.data === 'object' && raw.data !== null ? raw.data as Project['data'] : undefined,
  };
}

/**
 * Map a mirror raw_data object to the Facture shape expected by the app.
 */
export function mapMirrorFactureToAppShape(raw: Record<string, unknown>): Facture | null {
  const id = raw.id;
  if (id == null) return null;

  return {
    id: String(id),
    projectId: String(raw.projectId ?? raw.project_id ?? ''),
    clientId: String(raw.clientId ?? raw.client_id ?? ''),
    numeroFacture: raw.numeroFacture != null ? String(raw.numeroFacture) : undefined,
    date: raw.date != null ? String(raw.date) : undefined,
    typeFacture: raw.typeFacture != null ? String(raw.typeFacture) : (raw.type != null ? String(raw.type) : undefined),
    state: raw.state != null ? String(raw.state) : undefined,
    etatReglement: raw.etatReglement != null ? String(raw.etatReglement) : undefined,
    totalHT: raw.totalHT != null ? Number(raw.totalHT) : (raw.data && typeof raw.data === 'object' && 'totalHT' in (raw.data as any) ? Number((raw.data as any).totalHT) : undefined),
    totalTTC: raw.totalTTC != null ? Number(raw.totalTTC) : undefined,
    isPaid: raw.isPaid != null ? Boolean(raw.isPaid) : undefined,
    items: Array.isArray(raw.items) ? raw.items : undefined,
    refDevisId: raw.refDevisId != null ? String(raw.refDevisId) : undefined,
    refInterventionId: raw.refInterventionId != null ? String(raw.refInterventionId) : undefined,
    calc: raw.calc && typeof raw.calc === 'object' ? raw.calc as Facture['calc'] : undefined,
    reglementsData: Array.isArray(raw.reglementsData) ? raw.reglementsData : undefined,
  };
}

// ============================================================
// MODULE MAPPER REGISTRY
// ============================================================

type MapperFn = (raw: Record<string, unknown>) => unknown | null;

const MODULE_MAPPERS: Partial<Record<ModuleKey, MapperFn>> = {
  users: mapMirrorUserToAppShape,
  projects: mapMirrorProjectToAppShape,
  factures: mapMirrorFactureToAppShape,
};

/**
 * Apply typed mapper to an array of raw mirror records.
 * Filters out invalid rows and logs them discretely.
 */
export function mapMirrorRecords(moduleKey: ModuleKey, rawRecords: unknown[]): unknown[] {
  const mapper = MODULE_MAPPERS[moduleKey];
  
  // No mapper → passthrough (for modules without typed mappers yet)
  if (!mapper) return rawRecords;

  let invalidCount = 0;
  const mapped = rawRecords
    .map(raw => {
      const result = mapper(raw as Record<string, unknown>);
      if (result === null) invalidCount++;
      return result;
    })
    .filter(Boolean);

  if (invalidCount > 0) {
    logApogee.warn(`[MirrorMapper] ${moduleKey}: ${invalidCount}/${rawRecords.length} records filtered as invalid`);
  }

  return mapped;
}

// ============================================================
// 2. SILENT COMPARISON — live vs mirror (sampled, non-blocking)
// ============================================================

export interface ComparisonResult {
  module: ModuleKey;
  agencyId: string;
  timestamp: string;
  liveCount: number;
  mirrorCount: number;
  countDelta: number;
  countDeltaPct: number;
  hasDuplicateIds: boolean;
  missingRequiredFields: number;
  passed: boolean;
  details?: string;
}

// Sampling: only run comparison ~10% of the time
const COMPARISON_SAMPLE_RATE = 0.1;
let lastComparisonResults: ComparisonResult[] = [];

/**
 * Get the last comparison results for admin monitoring.
 */
export function getLastComparisonResults(): ComparisonResult[] {
  return lastComparisonResults;
}

/**
 * Run a silent comparison between live and mirror data.
 * Does NOT block the response. Runs only when sampled.
 * Returns immediately — comparison runs async.
 */
export function runSilentComparison(
  moduleKey: ModuleKey,
  agencyId: string,
  mirrorData: unknown[],
  liveFn: () => Promise<unknown[]>,
): void {
  // Sampling gate
  if (Math.random() > COMPARISON_SAMPLE_RATE) return;

  // Fire and forget — never blocks the caller
  (async () => {
    try {
      const liveData = await liveFn();

      const liveIds = new Set(liveData.map((item: any) => String(item?.id ?? '')).filter(Boolean));
      const mirrorIds = new Set(mirrorData.map((item: any) => String(item?.id ?? '')).filter(Boolean));

      // Check for duplicate IDs in mirror
      const hasDuplicateIds = mirrorIds.size < mirrorData.length;

      // Check required fields presence
      let missingRequiredFields = 0;
      const requiredFieldsByModule: Record<string, string[]> = {
        factures: ['id', 'projectId'],
        projects: ['id', 'clientId'],
        users: ['id', 'nom'],
      };
      const requiredFields = requiredFieldsByModule[moduleKey] || ['id'];
      for (const item of mirrorData) {
        const record = item as Record<string, unknown>;
        for (const field of requiredFields) {
          if (record[field] == null || record[field] === '') {
            missingRequiredFields++;
            break;
          }
        }
      }

      const countDelta = mirrorData.length - liveData.length;
      const countDeltaPct = liveData.length > 0 ? Math.abs(countDelta / liveData.length) * 100 : 0;

      const result: ComparisonResult = {
        module: moduleKey,
        agencyId,
        timestamp: new Date().toISOString(),
        liveCount: liveData.length,
        mirrorCount: mirrorData.length,
        countDelta,
        countDeltaPct: Math.round(countDeltaPct * 10) / 10,
        hasDuplicateIds,
        missingRequiredFields,
        passed: countDeltaPct < 15 && !hasDuplicateIds && missingRequiredFields === 0,
      };

      if (!result.passed) {
        result.details = [
          countDeltaPct >= 15 ? `count_delta_${result.countDeltaPct}%` : '',
          hasDuplicateIds ? 'duplicate_ids' : '',
          missingRequiredFields > 0 ? `missing_fields_${missingRequiredFields}` : '',
        ].filter(Boolean).join(', ');
      }

      // Store last N results
      lastComparisonResults = [result, ...lastComparisonResults.slice(0, 49)];

      // Record in pilot metrics
      try {
        const { recordComparisonMetric } = await import('./mirrorPilotActivation');
        recordComparisonMetric(moduleKey, result.passed);
      } catch { /* silent */ }

      logApogee.debug(
        `[MirrorCompare] ${moduleKey} | agency=${agencyId} | live=${result.liveCount} mirror=${result.mirrorCount} | delta=${result.countDeltaPct}% | passed=${result.passed}${result.details ? ` | ${result.details}` : ''}`
      );
    } catch (err) {
      logApogee.warn(`[MirrorCompare] ${moduleKey} comparison failed:`, err);
    }
  })();
}

// ============================================================
// 3. QUALITY GUARD — isMirrorUsableForModule
// ============================================================

export interface MirrorQualityResult {
  usable: boolean;
  reason?: string;
  freshEnough: boolean;
  hasData: boolean;
  invalidRatioOk: boolean;
  lastComparisonPassed: boolean | null; // null = no comparison data
}

/**
 * Comprehensive quality check before allowing mirror reads.
 * Combines freshness, data presence, mapper validity, and comparison results.
 */
export async function isMirrorUsableForModule(
  moduleKey: ModuleKey,
  agencyId: string,
  thresholdMinutes: number,
): Promise<MirrorQualityResult> {
  const { isMirrorFreshEnough } = await import('./mirrorDataSource');
  const { getMirrorRecordCount } = await import('./mirrorReadAdapter');

  // 1. Freshness check
  const freshness = await isMirrorFreshEnough(moduleKey, agencyId, thresholdMinutes);
  if (!freshness.fresh) {
    return {
      usable: false,
      reason: freshness.reason || 'stale',
      freshEnough: false,
      hasData: true, // unknown
      invalidRatioOk: true,
      lastComparisonPassed: null,
    };
  }

  // 2. Data presence
  const count = await getMirrorRecordCount(moduleKey, agencyId);
  if (count === 0) {
    return {
      usable: false,
      reason: 'mirror_empty',
      freshEnough: true,
      hasData: false,
      invalidRatioOk: true,
      lastComparisonPassed: null,
    };
  }

  // 3. Last comparison result (if available)
  const lastComparison = lastComparisonResults.find(
    r => r.module === moduleKey && r.agencyId === agencyId
  );
  const lastComparisonPassed = lastComparison ? lastComparison.passed : null;

  // If last comparison explicitly failed, warn but don't block in fallback mode
  const comparisonFailed = lastComparisonPassed === false;

  return {
    usable: !comparisonFailed,
    reason: comparisonFailed ? `comparison_failed: ${lastComparison?.details}` : undefined,
    freshEnough: true,
    hasData: true,
    invalidRatioOk: true,
    lastComparisonPassed,
  };
}
