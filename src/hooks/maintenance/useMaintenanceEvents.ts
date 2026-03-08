/**
 * Hook pour la gestion des événements de maintenance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { 
  MaintenanceEvent, 
  MaintenanceEventsFilters, 
  MaintenanceEventFormData,
  CompleteMaintenanceEventData,
  MaintenancePlanItem,
  FrequencyUnit
} from '@/types/maintenance';
import { addDays, addMonths, addYears, parseISO, format } from 'date-fns';

const QUERY_KEY = 'maintenance-events';

export function useMaintenanceEvents(agencyId?: string, filters?: MaintenanceEventsFilters) {
  const { agence } = useProfile();
  const effectiveAgencyId = agencyId || agence;

  return useQuery({
    queryKey: [QUERY_KEY, effectiveAgencyId, filters],
    queryFn: async (): Promise<MaintenanceEvent[]> => {
      let query = supabase
        .from('maintenance_events')
        .select(`
          *,
          vehicle:fleet_vehicles!vehicle_id(id, name, registration),
          tool:tools!tool_id(id, label, category),
          plan_item:maintenance_plan_items!plan_item_id(id, label, frequency_unit, frequency_value),
          completed_by_collaborator:collaborators!completed_by(id, first_name, last_name)
        `)
        .order('scheduled_at', { ascending: true });

      // Filtre agence
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      // Filtres optionnels
      if (filters?.targetType) {
        query = query.eq('target_type', filters.targetType);
      }
      if (filters?.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId);
      }
      if (filters?.toolId) {
        query = query.eq('tool_id', filters.toolId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.from) {
        query = query.gte('scheduled_at', filters.from);
      }
      if (filters?.to) {
        query = query.lte('scheduled_at', filters.to);
      }

      const result = await safeQuery<MaintenanceEvent[]>(query, 'MAINTENANCE_EVENTS_FETCH');
      if (!result.success) {
        logError('[useMaintenanceEvents] Erreur fetch', result.error);
        return [];
      }

      return result.data || [];
    },
    enabled: !!effectiveAgencyId,
  });
}

export function useMaintenanceEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', eventId],
    queryFn: async (): Promise<MaintenanceEvent | null> => {
      if (!eventId) return null;

      const result = await safeQuery<MaintenanceEvent[]>(
        supabase
          .from('maintenance_events')
          .select(`
            *,
            vehicle:fleet_vehicles!vehicle_id(id, name, registration),
            tool:tools!tool_id(id, label, category),
            plan_item:maintenance_plan_items!plan_item_id(id, label, frequency_unit, frequency_value),
            completed_by_collaborator:collaborators!completed_by(id, first_name, last_name)
          `)
          .eq('id', eventId)
          .limit(1),
        'MAINTENANCE_EVENT_DETAIL'
      );

      if (!result.success || !result.data?.length) {
        return null;
      }
      return result.data[0];
    },
    enabled: !!eventId,
  });
}

export function useCreateMaintenanceEvent() {
  const queryClient = useQueryClient();
  const { agence } = useProfile();

  return useMutation({
    mutationFn: async (data: MaintenanceEventFormData) => {
      if (!agence) throw new Error('Agence non définie');

      const result = await safeMutation<MaintenanceEvent[]>(
        supabase
          .from('maintenance_events')
          .insert({
            agency_id: agence,
            ...data,
          })
          .select(),
        'MAINTENANCE_EVENT_CREATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur création événement');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Complète un événement de maintenance et crée le prochain si lié à un plan
 */
export function useCompleteMaintenanceEvent() {
  const queryClient = useQueryClient();
  const { agence } = useProfile();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      data,
      planItem 
    }: { 
      eventId: string; 
      data: CompleteMaintenanceEventData;
      planItem?: MaintenancePlanItem | null;
    }) => {
      // 1. Mettre à jour l'événement actuel
      const updateResult = await safeMutation<MaintenanceEvent[]>(
        supabase
          .from('maintenance_events')
          .update({
            status: 'completed',
            completed_at: data.completed_at,
            completed_by: data.completed_by,
            mileage_km: data.mileage_km,
            notes: data.notes,
          })
          .eq('id', eventId)
          .select(`
            *,
            vehicle:fleet_vehicles!vehicle_id(id, name),
            tool:tools!tool_id(id, label)
          `),
        'MAINTENANCE_EVENT_COMPLETE'
      );

      if (!updateResult.success || !updateResult.data?.[0]) {
        throw new Error(updateResult.error?.message || 'Erreur complétion événement');
      }

      const completedEvent = updateResult.data[0];

      // 2. Si lié à un plan, créer le prochain événement
      if (planItem && agence) {
        const completedDate = parseISO(data.completed_at);
        let nextScheduledAt: Date;

        // Calculer la prochaine échéance selon l'unité de fréquence
        switch (planItem.frequency_unit as FrequencyUnit) {
          case 'days':
            nextScheduledAt = addDays(completedDate, planItem.frequency_value);
            break;
          case 'months':
            nextScheduledAt = addMonths(completedDate, planItem.frequency_value);
            break;
          case 'years':
            nextScheduledAt = addYears(completedDate, planItem.frequency_value);
            break;
          case 'km':
            // Pour les km, on garde la même date + fréquence en jours par défaut (ex: 30 jours)
            nextScheduledAt = addDays(completedDate, 30);
            break;
          default:
            nextScheduledAt = addMonths(completedDate, 1);
        }

        await safeMutation(
          supabase
            .from('maintenance_events')
            .insert({
              agency_id: agence,
              target_type: completedEvent.target_type,
              vehicle_id: completedEvent.vehicle_id,
              tool_id: completedEvent.tool_id,
              plan_item_id: planItem.id,
              label: planItem.label,
              scheduled_at: format(nextScheduledAt, 'yyyy-MM-dd'),
              status: 'scheduled',
            }),
          'MAINTENANCE_EVENT_NEXT_CREATE'
        );
      }

      // 3. Fermer les alertes associées
      await safeMutation(
        supabase
          .from('maintenance_alerts')
          .update({ 
            status: 'closed',
            closed_at: new Date().toISOString(),
          })
          .eq('maintenance_event_id', eventId)
          .eq('status', 'open'),
        'MAINTENANCE_ALERT_CLOSE'
      );

      return completedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
    },
  });
}

export function useCancelMaintenanceEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const result = await safeMutation<MaintenanceEvent[]>(
        supabase
          .from('maintenance_events')
          .update({ status: 'cancelled' })
          .eq('id', eventId)
          .select(),
        'MAINTENANCE_EVENT_CANCEL'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur annulation événement');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteMaintenanceEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const result = await safeMutation(
        supabase
          .from('maintenance_events')
          .delete()
          .eq('id', eventId),
        'MAINTENANCE_EVENT_DELETE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur suppression événement');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
