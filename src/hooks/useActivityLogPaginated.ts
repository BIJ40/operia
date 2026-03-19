/**
 * Paginated Activity Log hook using cursor-based pagination.
 * Drop-in replacement for useActivityLog when dealing with large datasets.
 * 
 * Uses created_at as cursor for stable keyset pagination.
 */

import { useCursorPagination, flattenPages } from './useCursorPagination';
import type { ActivityLogEntry, ActivityLogFilters } from './useActivityLog';

export function useActivityLogPaginated(filters?: ActivityLogFilters) {
  const result = useCursorPagination<ActivityLogEntry>({
    queryKey: ['activity-log-paginated', filters],
    table: 'activity_log',
    cursorColumn: 'created_at',
    orderAscending: false,
    pageSize: filters?.limit || 50,
    enabled: true,
    staleTime: 30_000,
    filters: (query: any) => {
      let q = query;
      if (filters?.module) q = q.eq('module', filters.module);
      if (filters?.entityType) q = q.eq('entity_type', filters.entityType);
      if (filters?.entityId) q = q.eq('entity_id', filters.entityId);
      if (filters?.actorType) q = q.eq('actor_type', filters.actorType);
      if (filters?.actorId) q = q.eq('actor_id', filters.actorId);
      if (filters?.action) q = q.eq('action', filters.action);
      if (filters?.fromDate) q = q.gte('created_at', filters.fromDate);
      if (filters?.toDate) q = q.lte('created_at', filters.toDate);
      return q;
    },
  });

  return {
    ...result,
    /** Flattened entries across all loaded pages */
    entries: flattenPages(result.data?.pages),
  };
}
