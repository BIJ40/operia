/**
 * ActivityLogRepository — Typed Supabase queries for activity logs.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { DEFAULT_LIST_LIMIT } from '@/services/BaseQueryService';

const ACTIVITY_LOG_COLUMNS = 'id, agency_id, actor_type, actor_id, action, module, entity_type, entity_id, entity_label, old_values, new_values, metadata, created_at' as const;

export interface ActivityLogRow {
  id: string;
  agency_id: string | null;
  actor_type: string;
  actor_id: string | null;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLogFilters {
  module?: string;
  entityType?: string;
  entityId?: string;
  actorType?: string;
  actorId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export async function listActivityLogs(
  filters: ActivityLogFilters = {}
): Promise<ActivityLogRow[]> {
  const limit = filters.limit ?? 100;

  let query = supabase
    .from('activity_log')
    .select(ACTIVITY_LOG_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.module) query = query.eq('module', filters.module);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.entityId) query = query.eq('entity_id', filters.entityId);
  if (filters.actorType) query = query.eq('actor_type', filters.actorType as 'user' | 'apporteur' | 'system' | 'ai');
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);

  const { data, error } = await query;

  if (error) {
    logError('[activityLogRepository.listActivityLogs]', error);
    throw error;
  }
  return (data ?? []) as ActivityLogRow[];
}

export async function listEntityHistory(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select(ACTIVITY_LOG_COLUMNS)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logError('[activityLogRepository.listEntityHistory]', error);
    throw error;
  }
  return (data ?? []) as ActivityLogRow[];
}
