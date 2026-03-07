/**
 * BaseQueryService — Standardized Supabase query patterns.
 * 
 * Provides typed, bounded queries with consistent error handling.
 * All listing queries enforce a default limit to prevent unbounded fetches.
 * 
 * Usage:
 * ```ts
 * const service = new BaseQueryService('my_table');
 * const items = await service.list({ agencyId, columns: 'id, name', limit: 100 });
 * const item = await service.getById(id, 'id, name, status');
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

// Default maximum rows for listing queries (Supabase default is 1000)
const DEFAULT_LIST_LIMIT = 500;

export interface ListOptions {
  /** Agency ID filter (applied as .eq('agency_id', agencyId)) */
  agencyId?: string | null;
  /** Columns to select (default: '*') */
  columns?: string;
  /** Maximum rows to return */
  limit?: number;
  /** Order by column */
  orderBy?: string;
  /** Ascending order? (default: true) */
  ascending?: boolean;
  /** Additional filters as key-value pairs */
  filters?: Record<string, unknown>;
}

export interface ServiceResult<T> {
  data: T;
  error: Error | null;
}

export class BaseQueryService<T = any> {
  constructor(
    protected readonly tableName: string,
    protected readonly defaultColumns: string = '*',
    protected readonly defaultLimit: number = DEFAULT_LIST_LIMIT,
  ) {}

  /**
   * List records with automatic limit, ordering, and agency filtering.
   */
  async list(options: ListOptions = {}): Promise<T[]> {
    const {
      agencyId,
      columns = this.defaultColumns,
      limit = this.defaultLimit,
      orderBy,
      ascending = true,
      filters,
    } = options;

    try {
      let query = supabase
        .from(this.tableName)
        .select(columns)
        .limit(limit);

      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }

      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      const { data, error } = await query;

      if (error) {
        logError(`[${this.tableName}] list() failed:`, error);
        throw error;
      }

      return (data ?? []) as T[];
    } catch (error) {
      logError(`[${this.tableName}] list() exception:`, error);
      throw error;
    }
  }

  /**
   * Get a single record by ID.
   */
  async getById(id: string, columns?: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(columns ?? this.defaultColumns)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logError(`[${this.tableName}] getById(${id}) failed:`, error);
        throw error;
      }

      return data as T | null;
    } catch (error) {
      logError(`[${this.tableName}] getById() exception:`, error);
      throw error;
    }
  }

  /**
   * Count records matching filters.
   */
  async count(options: Pick<ListOptions, 'agencyId' | 'filters'> = {}): Promise<number> {
    const { agencyId, filters } = options;

    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      const { count, error } = await query;

      if (error) {
        logError(`[${this.tableName}] count() failed:`, error);
        throw error;
      }

      return count ?? 0;
    } catch (error) {
      logError(`[${this.tableName}] count() exception:`, error);
      throw error;
    }
  }
}
