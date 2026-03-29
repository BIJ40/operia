import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  scope_type: string;
  target_type: string;
  target_id: string;
  module_key: string | null;
  action_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  module_key?: string;
  action_type?: string;
  actor_user_id?: string;
  target_id?: string;
  from_date?: string;
  to_date?: string;
}

export function usePermissionsAuditLog(filters: AuditLogFilters = {}, limit = 100) {
  return useQuery({
    queryKey: ['permissions_audit_log', filters, limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      let query = supabase
        .from('permissions_audit_log')
        .select('id,scope_type,target_type,target_id,module_key,action_type,old_value,new_value,reason,actor_user_id,actor_role,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters.module_key) query = query.eq('module_key', filters.module_key);
      if (filters.action_type) query = query.eq('action_type', filters.action_type);
      if (filters.actor_user_id) query = query.eq('actor_user_id', filters.actor_user_id);
      if (filters.target_id) query = query.eq('target_id', filters.target_id);
      if (filters.from_date) query = query.gte('created_at', filters.from_date);
      if (filters.to_date) query = query.lte('created_at', filters.to_date);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AuditLogEntry[];
    },
    staleTime: 30 * 1000,
  });
}
