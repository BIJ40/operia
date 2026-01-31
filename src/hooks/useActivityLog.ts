/**
 * Hook unifié pour le système Activity Log
 * Base de données pour le Copilote IA
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';

export type ActivityActorType = 'user' | 'apporteur' | 'system' | 'ai';

export interface ActivityLogEntry {
  id: string;
  agency_id: string | null;
  actor_type: ActivityActorType;
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
  actorType?: ActivityActorType;
  actorId?: string;
  action?: string;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

interface LogActivityParams {
  action: string;
  module: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actorType?: ActivityActorType;
  actorId?: string;
  agencyId?: string;
}

/**
 * Hook pour lire les logs d'activité avec filtres
 */
export function useActivityLog(filters?: ActivityLogFilters) {
  return useQuery({
    queryKey: ['activity-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.module) query = query.eq('module', filters.module);
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters?.entityId) query = query.eq('entity_id', filters.entityId);
      if (filters?.actorType) query = query.eq('actor_type', filters.actorType);
      if (filters?.actorId) query = query.eq('actor_id', filters.actorId);
      if (filters?.action) query = query.eq('action', filters.action);
      if (filters?.fromDate) query = query.gte('created_at', filters.fromDate);
      if (filters?.toDate) query = query.lte('created_at', filters.toDate);

      const { data, error } = await query;
      
      if (error) {
        logError('[ACTIVITY_LOG] Failed to fetch logs', { error, filters });
        throw error;
      }
      
      return (data || []) as ActivityLogEntry[];
    },
    staleTime: 30000,
  });
}

/**
 * Hook pour récupérer l'historique d'une entité spécifique
 */
export function useEntityHistory(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['activity-log', 'entity', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logError('[ACTIVITY_LOG] Failed to fetch entity history', { error, entityType, entityId });
        throw error;
      }

      return (data || []) as ActivityLogEntry[];
    },
    enabled: !!entityId,
    staleTime: 30000,
  });
}

/**
 * Hook pour logger une action manuellement (via RPC)
 */
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogActivityParams) => {
      const { data, error } = await supabase.rpc('log_activity', {
        p_action: params.action,
        p_module: params.module,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_entity_label: params.entityLabel || null,
        p_old_values: (params.oldValues || null) as Json,
        p_new_values: (params.newValues || null) as Json,
        p_metadata: (params.metadata || null) as Json,
        p_actor_type: params.actorType || 'user',
        p_actor_id: params.actorId || null,
        p_agency_id: params.agencyId || null,
      });

      if (error) {
        logError('[ACTIVITY_LOG] Failed to log activity', { error, params });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
}

// ============================================================================
// Helpers pour formater les logs
// ============================================================================

export function formatAction(action: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Création',
    UPDATE: 'Modification',
    DELETE: 'Suppression',
    VIEW: 'Consultation',
    LOGIN: 'Connexion',
    LOGOUT: 'Déconnexion',
    EXPORT: 'Export',
    IMPORT: 'Import',
    SYNC: 'Synchronisation',
  };
  return labels[action] || action;
}

export function formatModule(module: string): string {
  const labels: Record<string, string> = {
    rh: 'Ressources Humaines',
    parc: 'Parc Véhicules',
    tickets: 'Tickets Apogée',
    mediatheque: 'Médiathèque',
    apporteurs: 'Portail Apporteurs',
    statia: 'StatIA',
    system: 'Système',
  };
  return labels[module] || module;
}

export function formatEntityType(entityType: string): string {
  const labels: Record<string, string> = {
    collaborators: 'Collaborateur',
    employment_contracts: 'Contrat',
    salary_history: 'Salaire',
    document_requests: 'Demande document',
    fleet_vehicles: 'Véhicule',
    epi_assignments: 'Attribution EPI',
    epi_incidents: 'Incident EPI',
    apogee_tickets: 'Ticket',
    media_assets: 'Média',
    apporteurs: 'Apporteur',
    apporteur_intervention_requests: 'Demande intervention',
  };
  return labels[entityType] || entityType;
}

export function formatActorType(actorType: ActivityActorType): string {
  const labels: Record<ActivityActorType, string> = {
    user: 'Utilisateur',
    apporteur: 'Apporteur',
    system: 'Système',
    ai: 'IA',
  };
  return labels[actorType];
}
