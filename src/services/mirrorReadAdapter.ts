/**
 * Mirror Read Adapter
 * 
 * Reads data from mirror tables and maps raw_data back to the
 * format expected by existing application code.
 * 
 * IMPORTANT: This adapter is only used when resolveEffectiveSource
 * returns 'mirror'. It does NOT replace any existing code path.
 */

import { supabase } from '@/integrations/supabase/client';
import { logApogee } from '@/lib/logger';
import type { ModuleKey } from './mirrorDataSource';

// ============================================================
// MIRROR TABLE NAMES
// ============================================================

const MIRROR_TABLES: Record<ModuleKey, string> = {
  factures: 'factures_mirror',
  projects: 'projects_mirror',
  interventions: 'interventions_mirror',
  devis: 'devis_mirror',
  users: 'users_mirror',
  clients: 'clients_mirror',
};

// ============================================================
// GENERIC MIRROR READ
// ============================================================

interface MirrorRow {
  apogee_id: string;
  raw_data: Record<string, unknown>;
  synced_at: string;
  mirror_status: string;
  source_updated_at: string | null;
}

/**
 * Read all synced records from a mirror table for a given agency.
 * Returns the raw_data payloads mapped to look like live API responses.
 */
export async function readMirrorData(
  moduleKey: ModuleKey,
  agencyId: string,
): Promise<unknown[]> {
  const tableName = MIRROR_TABLES[moduleKey];
  if (!tableName) {
    logApogee.warn(`[MirrorRead] Unknown module: ${moduleKey}`);
    return [];
  }

  const { data, error } = await supabase
    .from(tableName as any)
    .select('apogee_id, raw_data, synced_at, mirror_status, source_updated_at')
    .eq('agency_id', agencyId)
    .eq('mirror_status', 'synced') as { data: MirrorRow[] | null; error: any };

  if (error) {
    logApogee.error(`[MirrorRead] Error reading ${tableName}:`, error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Extract raw_data and ensure the 'id' field is preserved
  return data.map(row => {
    const raw = row.raw_data as Record<string, unknown>;
    // Ensure apogee_id is mapped back as 'id' if missing
    if (raw.id === undefined) {
      raw.id = row.apogee_id;
    }
    return raw;
  });
}

/**
 * Read mirror data count for a module/agency (useful for validation).
 */
export async function getMirrorRecordCount(
  moduleKey: ModuleKey,
  agencyId: string,
): Promise<number> {
  const tableName = MIRROR_TABLES[moduleKey];
  const { count, error } = await supabase
    .from(tableName as any)
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('mirror_status', 'synced');

  if (error) return 0;
  return count ?? 0;
}
