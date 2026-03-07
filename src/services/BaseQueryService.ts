/**
 * BaseQueryService — Standardized Supabase query patterns.
 * 
 * Provides typed, bounded queries with consistent error handling.
 * All listing queries enforce a default limit to prevent unbounded fetches.
 * 
 * Usage:
 * ```ts
 * // Use the factory functions for type-safe queries:
 * const items = await queryList('collaborators', {
 *   agencyId, orderBy: 'last_name', limit: 200
 * });
 * const item = await queryById('profiles', userId);
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

// Default maximum rows for listing queries
const DEFAULT_LIST_LIMIT = 500;

type TableName = keyof Database['public']['Tables'];

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
export async function queryList<T extends TableName>(
  table: T,
  options: ListOptions = {},
): Promise<Database['public']['Tables'][T]['Row'][]> {
  const {
    agencyId,
    limit = DEFAULT_LIST_LIMIT,
    orderBy,
    ascending = true,
  } = options;

  try {
    let query = supabase
      .from(table)
      .select('*')
      .limit(limit);

    if (agencyId) {
      query = query.eq('agency_id' as any, agencyId);
    }

    if (orderBy) {
      query = query.order(orderBy as any, { ascending });
    }

    const { data, error } = await query;

    if (error) {
      logError(`[queryList:${table}] failed:`, error);
      throw error;
    }

    return (data ?? []) as Database['public']['Tables'][T]['Row'][];
  } catch (error) {
    logError(`[queryList:${table}] exception:`, error);
    throw error;
  }
}

/**
 * Get a single record by ID.
 */
export async function queryById<T extends TableName>(
  table: T,
  id: string,
): Promise<Database['public']['Tables'][T]['Row'] | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id' as any, id)
      .maybeSingle();

    if (error) {
      logError(`[queryById:${table}] failed:`, error);
      throw error;
    }

    return data as Database['public']['Tables'][T]['Row'] | null;
  } catch (error) {
    logError(`[queryById:${table}] exception:`, error);
    throw error;
  }
}

/**
 * Count records matching optional agency filter.
 */
export async function queryCount<T extends TableName>(
  table: T,
  options: Pick<ListOptions, 'agencyId'> = {},
): Promise<number> {
  const { agencyId } = options;

  try {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (agencyId) {
      query = query.eq('agency_id' as any, agencyId);
    }

    const { count, error } = await query;

    if (error) {
      logError(`[queryCount:${table}] failed:`, error);
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    logError(`[queryCount:${table}] exception:`, error);
    throw error;
  }
}

/** Re-export the default limit for hooks that need it */
export { DEFAULT_LIST_LIMIT };
