/**
 * Hook unifié pour le système Activity Log
 * Base de données pour le Copilote IA
 * 
 * MIGRATED: Uses activityLogRepository for data access
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';
import {
  listActivityLogs,
  listEntityHistory,
  type ActivityLogRow,
  type ActivityLogFilters as RepoFilters,
} from '@/repositories/activityLogRepository';

export type ActivityActorType = 'user' | 'apporteur' | 'system' | 'ai';

export type ActivityLogEntry = ActivityLogRow;

export interface ActivityLogFilters extends RepoFilters {}

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
    queryFn: () => listActivityLogs(filters),
    staleTime: 30000,
  });
}

/**
 * Hook pour récupérer l'historique d'une entité spécifique
 */
export function useEntityHistory(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['activity-log', 'entity', entityType, entityId],
    queryFn: () => listEntityHistory(entityType, entityId!),
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
