/**
 * useCursorPagination — Generic cursor-based pagination hook for Supabase.
 *
 * Replaces offset/limit patterns with keyset pagination for stable,
 * performant scrolling on large datasets (activity_log, tickets, etc.).
 *
 * Usage:
 * ```ts
 * const { data, fetchNextPage, hasNextPage, isLoading } = useCursorPagination({
 *   queryKey: ['activity-log'],
 *   table: 'activity_log',
 *   cursorColumn: 'created_at',
 *   orderAscending: false,
 *   pageSize: 50,
 *   filters: (query) => query.eq('module', 'rh'),
 * });
 * ```
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

// Generic query builder type — Supabase's exact generic is too complex for dynamic table names
type SupabaseQueryBuilder = ReturnType<ReturnType<typeof supabase.from>['select']>;

export interface CursorPaginationOptions<T = unknown> {
  /** React Query key */
  queryKey: unknown[];
  /** Supabase table name */
  table: string;
  /** Column to use as cursor (must be indexed, typically created_at or id) */
  cursorColumn: string;
  /** Select expression (default: '*') */
  select?: string;
  /** Sort ascending? (default: false = newest first) */
  orderAscending?: boolean;
  /** Rows per page (default: 50) */
  pageSize?: number;
  /** Apply additional filters to the query */
  filters?: (query: SupabaseQueryBuilder) => SupabaseQueryBuilder;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Stale time in ms */
  staleTime?: number;
}

export function useCursorPagination<T = unknown>(options: CursorPaginationOptions<T>) {
  const {
    queryKey,
    table,
    cursorColumn,
    select = '*',
    orderAscending = false,
    pageSize = 50,
    filters,
    enabled = true,
    staleTime = 30_000,
  } = options;

  return useInfiniteQuery<T[], Error>({
    queryKey: [...queryKey, { pageSize, cursorColumn, orderAscending }],
    queryFn: async ({ pageParam }) => {
      // supabase.from() returns a dynamic type based on table name; we use SupabaseQueryBuilder
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic table name prevents static typing
      let query: SupabaseQueryBuilder = (supabase as any)
        .from(table)
        .select(select)
        .order(cursorColumn, { ascending: orderAscending })
        .limit(pageSize);

      // Apply cursor: fetch rows AFTER the last cursor value
      if (pageParam) {
        if (orderAscending) {
          query = query.gt(cursorColumn, pageParam);
        } else {
          query = query.lt(cursorColumn, pageParam);
        }
      }

      // Apply user filters
      if (filters) {
        query = filters(query);
      }

      const { data, error } = await query;

      if (error) {
        logError(`[cursorPagination:${table}]`, error);
        throw error;
      }

      return (data ?? []) as T[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < pageSize) return undefined;
      // Use the last row's cursor column value as the next cursor
      const lastRow = lastPage[lastPage.length - 1] as Record<string, unknown>;
      return lastRow?.[cursorColumn] as string | null;
    },
    enabled,
    staleTime,
  });
}

/**
 * Flatten pages from useCursorPagination into a single array.
 */
export function flattenPages<T>(pages: T[][] | undefined): T[] {
  if (!pages) return [];
  return pages.flat();
}
