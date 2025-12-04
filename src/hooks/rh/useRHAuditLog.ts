import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';

export type RHAuditActionType = 
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_UPDATE'
  | 'DOCUMENT_VIEW'
  | 'REQUEST_CREATE'
  | 'REQUEST_UPDATE'
  | 'REQUEST_LOCK'
  | 'REQUEST_UNLOCK'
  | 'CONTRACT_CREATE'
  | 'CONTRACT_UPDATE'
  | 'CONTRACT_DELETE'
  | 'SALARY_CREATE'
  | 'SALARY_UPDATE'
  | 'SALARY_DELETE'
  | 'COLLABORATOR_CREATE'
  | 'COLLABORATOR_UPDATE'
  | 'PAYSLIP_ANALYZE';

export type RHAuditEntityType = 
  | 'document'
  | 'request'
  | 'contract'
  | 'salary'
  | 'collaborator'
  | 'payslip';

export interface RHAuditLogEntry {
  id: string;
  agency_id: string;
  user_id: string;
  collaborator_id: string | null;
  action_type: RHAuditActionType;
  entity_type: RHAuditEntityType;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined fields
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  collaborator?: {
    first_name: string;
    last_name: string;
  };
}

interface LogRHActionParams {
  actionType: RHAuditActionType;
  entityType: RHAuditEntityType;
  collaboratorId?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export function useRHAuditLog(collaboratorId?: string) {
  return useQuery({
    queryKey: ['rh-audit-log', collaboratorId],
    queryFn: async () => {
      let query = supabase
        .from('rh_audit_log')
        .select(`
          *,
          user:profiles!rh_audit_log_user_id_fkey(first_name, last_name, email),
          collaborator:collaborators(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (collaboratorId) {
        query = query.eq('collaborator_id', collaboratorId);
      }

      const { data, error } = await query;

      if (error) {
        logError('[RH_AUDIT] Failed to fetch audit log', { error });
        throw error;
      }

      return (data || []) as RHAuditLogEntry[];
    },
    staleTime: 30000,
  });
}

export function useLogRHAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogRHActionParams) => {
      const { data, error } = await supabase.rpc('log_rh_action', {
        p_action_type: params.actionType,
        p_entity_type: params.entityType,
        p_collaborator_id: params.collaboratorId || null,
        p_entity_id: params.entityId || null,
        p_old_values: (params.oldValues || null) as Json,
        p_new_values: (params.newValues || null) as Json,
        p_metadata: (params.metadata || null) as Json,
      });

      if (error) {
        logError('[RH_AUDIT] Failed to log action', { error, params });
        throw error;
      }

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['rh-audit-log'] });
      if (params.collaboratorId) {
        queryClient.invalidateQueries({ 
          queryKey: ['rh-audit-log', params.collaboratorId] 
        });
      }
    },
  });
}

// Helper pour formater les types d'action
export function formatActionType(action: RHAuditActionType): string {
  const labels: Record<RHAuditActionType, string> = {
    DOCUMENT_UPLOAD: 'Document uploadé',
    DOCUMENT_DELETE: 'Document supprimé',
    DOCUMENT_UPDATE: 'Document modifié',
    DOCUMENT_VIEW: 'Document consulté',
    REQUEST_CREATE: 'Demande créée',
    REQUEST_UPDATE: 'Demande mise à jour',
    REQUEST_LOCK: 'Demande verrouillée',
    REQUEST_UNLOCK: 'Demande déverrouillée',
    CONTRACT_CREATE: 'Contrat créé',
    CONTRACT_UPDATE: 'Contrat modifié',
    CONTRACT_DELETE: 'Contrat supprimé',
    SALARY_CREATE: 'Salaire créé',
    SALARY_UPDATE: 'Salaire modifié',
    SALARY_DELETE: 'Salaire supprimé',
    COLLABORATOR_CREATE: 'Collaborateur créé',
    COLLABORATOR_UPDATE: 'Collaborateur modifié',
    PAYSLIP_ANALYZE: 'Bulletin analysé',
  };
  return labels[action] || action;
}

// Helper pour formater les types d'entité
export function formatEntityType(entity: RHAuditEntityType): string {
  const labels: Record<RHAuditEntityType, string> = {
    document: 'Document',
    request: 'Demande',
    contract: 'Contrat',
    salary: 'Salaire',
    collaborator: 'Collaborateur',
    payslip: 'Bulletin',
  };
  return labels[entity] || entity;
}
