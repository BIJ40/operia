/**
 * Hook pour la gestion des alertes de maintenance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { MaintenanceAlert, MaintenanceAlertsFilters } from '@/types/maintenance';

const QUERY_KEY = 'maintenance-alerts';

export function useMaintenanceAlerts(agencyId?: string, filters?: MaintenanceAlertsFilters) {
  const { agence } = useProfile();
  const effectiveAgencyId = agencyId || agence;

  return useQuery({
    queryKey: [QUERY_KEY, effectiveAgencyId, filters],
    queryFn: async (): Promise<MaintenanceAlert[]> => {
      let query = supabase
        .from('maintenance_alerts')
        .select(`
          *,
          maintenance_event:maintenance_events!maintenance_event_id(
            id,
            label,
            target_type,
            scheduled_at,
            status,
            vehicle:fleet_vehicles!vehicle_id(id, name, registration),
            tool:tools!tool_id(id, label, category)
          )
        `)
        .order('created_at', { ascending: false });

      // Filtre agence
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      // Filtres optionnels
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const result = await safeQuery<MaintenanceAlert[]>(query, 'MAINTENANCE_ALERTS_FETCH');
      if (!result.success) {
        logError('[useMaintenanceAlerts] Erreur fetch', result.error);
        return [];
      }

      let alerts = result.data || [];

      // Filtre post-query pour targetType (via l'événement lié)
      if (filters?.targetType) {
        alerts = alerts.filter(a => a.maintenance_event?.target_type === filters.targetType);
      }

      return alerts;
    },
    enabled: !!effectiveAgencyId,
  });
}

export function useOpenMaintenanceAlertsCount(agencyId?: string) {
  const { agence } = useProfile();
  const effectiveAgencyId = agencyId || agence;

  return useQuery({
    queryKey: [QUERY_KEY, 'count', effectiveAgencyId],
    queryFn: async (): Promise<number> => {
      let query = supabase
        .from('maintenance_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');

      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      const { count, error } = await query;
      
      if (error) {
        logError('[useOpenMaintenanceAlertsCount] Erreur', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!effectiveAgencyId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, collaboratorId }: { alertId: string; collaboratorId: string }) => {
      const result = await safeMutation<MaintenanceAlert[]>(
        supabase
          .from('maintenance_alerts')
          .update({
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: collaboratorId,
          })
          .eq('id', alertId)
          .select(),
        'MAINTENANCE_ALERT_ACKNOWLEDGE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur accusé de réception');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useCloseAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, collaboratorId }: { alertId: string; collaboratorId: string }) => {
      const result = await safeMutation<MaintenanceAlert[]>(
        supabase
          .from('maintenance_alerts')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: collaboratorId,
          })
          .eq('id', alertId)
          .select(),
        'MAINTENANCE_ALERT_CLOSE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur clôture alerte');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
