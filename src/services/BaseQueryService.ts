/**
 * BaseQueryService — Standardized Supabase query patterns.
 * 
 * Provides bounded queries with consistent error handling.
 * All listing queries enforce a default limit to prevent unbounded fetches.
 * 
 * Usage:
 * ```ts
 * const items = await queryList('collaborators', {
 *   agencyId, orderBy: 'last_name', limit: 200
 * });
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

/** Default maximum rows for listing queries */
export const DEFAULT_LIST_LIMIT = 500;

export interface ListOptions {
  /** Agency ID filter */
  agencyId?: string | null;
  /** Maximum rows to return (default: 500) */
  limit?: number;
  /** Order by column */
  orderBy?: string;
  /** Ascending order? (default: true) */
  ascending?: boolean;
}

/**
 * List records from a table with automatic limit enforcement.
 * Always returns a bounded result set.
 */
export async function queryList(
  table: string,
  options: ListOptions = {},
) {
  const {
    agencyId,
    limit = DEFAULT_LIST_LIMIT,
    orderBy,
    ascending = true,
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from(table).select('*').limit(limit);

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }
  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  const { data, error } = await query;

  if (error) {
    logError(`[queryList:${table}]`, error);
    throw error;
  }

  return data ?? [];
}

/**
 * Get a single record by ID.
 */
export async function queryById(table: string, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logError(`[queryById:${table}]`, error);
    throw error;
  }

  return data;
}

/**
 * Count records matching optional agency filter.
 */
export async function queryCount(
  table: string,
  options: Pick<ListOptions, 'agencyId'> = {},
): Promise<number> {
  const { agencyId } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { count, error } = await query;

  if (error) {
    logError(`[queryCount:${table}]`, error);
    throw error;
  }

  return count ?? 0;
}
