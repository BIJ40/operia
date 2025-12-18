/**
 * IndexedDB Schema for Technician PWA Offline Storage
 * Uses Dexie for typed IndexedDB access
 */
import Dexie, { type Table } from 'dexie';

// ============================================
// Type Definitions
// ============================================

export interface PlanningCacheEntry {
  key: string; // date_yyyy_mm_dd
  data: TechnicianAppointment[];
  fetched_at: number; // timestamp
}

export interface TechnicianAppointment {
  id: string;
  project_id: number;
  date: string;
  time_start?: string;
  time_end?: string;
  type: string; // 'rt' | 'depannage' | 'travaux' | etc
  status: string;
  client_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  description?: string;
  univers?: string[];
  metadata?: Record<string, unknown>;
}

export interface FlowCacheEntry {
  key: string; // {flow_id}:{version}
  flow_id: string;
  version: number;
  data: FlowDefinitionJSON;
  hash: string;
  fetched_at: number;
}

export interface FlowDefinitionJSON {
  id: string;
  name: string;
  domain: 'rt' | 'depannage' | 'travaux';
  univers?: string;
  version: number;
  entryNodeId: string;
  nodes: FlowNodeJSON[];
  edges: FlowEdgeJSON[];
}

export interface FlowNodeJSON {
  id: string;
  type: 'question' | 'group' | 'decision' | 'terminal' | 'block_instance';
  position: { x: number; y: number };
  payload: Record<string, unknown>;
}

export interface FlowEdgeJSON {
  id: string;
  source: string;
  target: string;
  label?: string;
  when?: ConditionJSON;
  priority?: number;
  isDefault?: boolean;
}

export interface ConditionJSON {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: unknown;
}

export interface DraftEntry {
  key: string; // rdv_id
  flow_id: string;
  version: number;
  answers_json: Record<string, unknown>;
  current_node_id: string;
  history: string[]; // stack of visited node IDs
  updated_at: number;
  status: 'draft' | 'ready_to_submit' | 'submitted';
}

export interface OutboxEntry {
  id: string; // uuid
  rdv_id: string;
  op_type: 'SUBMIT_FLOW' | 'UPLOAD_FILE';
  payload_json: Record<string, unknown>;
  client_operation_id: string; // uuid for idempotence
  status: 'pending' | 'syncing' | 'done' | 'error';
  retry_count: number;
  last_error?: string;
  created_at: number;
  updated_at: number;
}

// ============================================
// Dexie Database Class
// ============================================

export class TechnicianDB extends Dexie {
  planning_cache!: Table<PlanningCacheEntry, string>;
  flow_cache!: Table<FlowCacheEntry, string>;
  drafts!: Table<DraftEntry, string>;
  outbox!: Table<OutboxEntry, string>;

  constructor() {
    super('TechnicianOfflineDB');

    this.version(1).stores({
      // Primary key is the first field, indexes follow
      planning_cache: 'key, fetched_at',
      flow_cache: 'key, flow_id, fetched_at',
      drafts: 'key, flow_id, status, updated_at',
      outbox: 'id, rdv_id, status, created_at, updated_at',
    });
  }
}

// Singleton instance
export const technicianDB = new TechnicianDB();

// ============================================
// Helper Functions
// ============================================

/**
 * Get today's date key in yyyy_mm_dd format
 */
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Cache planning data for a specific date
 */
export async function cachePlanningData(
  dateKey: string,
  appointments: TechnicianAppointment[]
): Promise<void> {
  await technicianDB.planning_cache.put({
    key: dateKey,
    data: appointments,
    fetched_at: Date.now(),
  });
}

/**
 * Get cached planning data
 */
export async function getCachedPlanning(
  dateKey: string
): Promise<PlanningCacheEntry | undefined> {
  return technicianDB.planning_cache.get(dateKey);
}

/**
 * Cache a flow definition
 */
export async function cacheFlowDefinition(
  flowId: string,
  version: number,
  data: FlowDefinitionJSON,
  hash: string
): Promise<void> {
  const key = `${flowId}:${version}`;
  await technicianDB.flow_cache.put({
    key,
    flow_id: flowId,
    version,
    data,
    hash,
    fetched_at: Date.now(),
  });
}

/**
 * Get cached flow definition
 */
export async function getCachedFlow(
  flowId: string,
  version: number
): Promise<FlowCacheEntry | undefined> {
  const key = `${flowId}:${version}`;
  return technicianDB.flow_cache.get(key);
}

/**
 * Save or update a draft
 */
export async function saveDraft(draft: DraftEntry): Promise<void> {
  await technicianDB.drafts.put({
    ...draft,
    updated_at: Date.now(),
  });
}

/**
 * Get draft for a specific RDV
 */
export async function getDraft(rdvId: string): Promise<DraftEntry | undefined> {
  return technicianDB.drafts.get(rdvId);
}

/**
 * Add item to outbox
 */
export async function addToOutbox(
  entry: Omit<OutboxEntry, 'id' | 'created_at' | 'updated_at' | 'retry_count' | 'status'>
): Promise<string> {
  const id = generateUUID();
  const now = Date.now();
  await technicianDB.outbox.add({
    ...entry,
    id,
    status: 'pending',
    retry_count: 0,
    created_at: now,
    updated_at: now,
  });
  return id;
}

/**
 * Get all pending outbox items
 */
export async function getPendingOutboxItems(): Promise<OutboxEntry[]> {
  return technicianDB.outbox
    .where('status')
    .anyOf(['pending', 'error'])
    .sortBy('created_at');
}

/**
 * Update outbox item status
 */
export async function updateOutboxStatus(
  id: string,
  status: OutboxEntry['status'],
  error?: string
): Promise<void> {
  const item = await technicianDB.outbox.get(id);
  if (item) {
    await technicianDB.outbox.update(id, {
      status,
      last_error: error,
      retry_count: status === 'error' ? item.retry_count + 1 : item.retry_count,
      updated_at: Date.now(),
    });
  }
}

/**
 * Clear old cache entries (older than specified days)
 */
export async function cleanupOldCache(maxAgeDays: number = 7): Promise<void> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  
  await technicianDB.planning_cache
    .where('fetched_at')
    .below(cutoff)
    .delete();
    
  await technicianDB.flow_cache
    .where('fetched_at')
    .below(cutoff)
    .delete();
}

/**
 * Get outbox statistics
 */
export async function getOutboxStats(): Promise<{
  pending: number;
  syncing: number;
  error: number;
  done: number;
}> {
  const [pending, syncing, error, done] = await Promise.all([
    technicianDB.outbox.where('status').equals('pending').count(),
    technicianDB.outbox.where('status').equals('syncing').count(),
    technicianDB.outbox.where('status').equals('error').count(),
    technicianDB.outbox.where('status').equals('done').count(),
  ]);
  return { pending, syncing, error, done };
}
