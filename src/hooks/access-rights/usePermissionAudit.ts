/**
 * Hook pour l'historique des permissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';

export interface PermissionAuditEntry {
  id: string;
  editor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  target_user_id: string | null;
  agency_id: string | null;
  changes: Record<string, any> | null;
  created_at: string;
  editor?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  target?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface AuditFilters {
  agencyId?: string;
  entityType?: string;
  action?: string;
  limit?: number;
}

export function usePermissionAudit(filters?: AuditFilters) {
  return useQuery({
    queryKey: ['permission-audit', filters],
    queryFn: async (): Promise<PermissionAuditEntry[]> => {
      let query = supabase
        .from('permission_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);
      
      if (filters?.agencyId) {
        query = query.eq('agency_id', filters.agencyId);
      }
      
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        editor: undefined,
        target: undefined,
      })) as PermissionAuditEntry[];
    },
  });
}

export function useAuditLog() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  
  const logMutation = useMutation({
    mutationFn: async (params: {
      action: string;
      entityType: string;
      entityId?: string;
      targetUserId?: string;
      agencyId?: string;
      changes?: Record<string, any>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('permission_audit').insert({
        editor_id: user.id,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        target_user_id: params.targetUserId || null,
        agency_id: params.agencyId || null,
        changes: params.changes || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-audit'] });
    },
  });
  
  const log = useCallback(async (params: {
    action: string;
    entityType: string;
    entityId?: string;
    targetUserId?: string;
    agencyId?: string;
    changes?: Record<string, any>;
  }) => {
    try {
      await logMutation.mutateAsync(params);
    } catch (e) {
      console.error('Failed to log audit entry:', e);
    }
  }, [logMutation]);
  
  return { log, isLogging: logMutation.isPending };
}
