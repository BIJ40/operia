/**
 * Hook pour la gestion des plans de maintenance préventive
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { 
  MaintenancePlanTemplate, 
  MaintenancePlanItem,
  MaintenancePlanTemplateFormData,
  MaintenancePlanItemFormData,
  MaintenanceTargetType
} from '@/types/maintenance';
import { addDays, format } from 'date-fns';

const QUERY_KEY = 'maintenance-plans';

export function useMaintenancePlans(agencyId?: string, targetType?: MaintenanceTargetType) {
  const { agence } = useProfile();
  const effectiveAgencyId = agencyId || agence;

  return useQuery({
    queryKey: [QUERY_KEY, effectiveAgencyId, targetType],
    queryFn: async (): Promise<MaintenancePlanTemplate[]> => {
      let query = supabase
        .from('maintenance_plan_templates')
        .select(`
          *,
          items:maintenance_plan_items(*)
        `)
        .order('name', { ascending: true });

      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      if (targetType) {
        query = query.eq('target_type', targetType);
      }

      const result = await safeQuery<MaintenancePlanTemplate[]>(query, 'MAINTENANCE_PLANS_FETCH');
      if (!result.success) {
        logError('[useMaintenancePlans] Erreur fetch', result.error);
        return [];
      }

      return result.data || [];
    },
    enabled: !!effectiveAgencyId,
  });
}

export function useMaintenancePlan(planId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', planId],
    queryFn: async (): Promise<MaintenancePlanTemplate | null> => {
      if (!planId) return null;

      const result = await safeQuery<MaintenancePlanTemplate[]>(
        supabase
          .from('maintenance_plan_templates')
          .select(`
            *,
            items:maintenance_plan_items(*)
          `)
          .eq('id', planId)
          .limit(1),
        'MAINTENANCE_PLAN_DETAIL'
      );

      if (!result.success || !result.data?.length) {
        return null;
      }
      return result.data[0];
    },
    enabled: !!planId,
  });
}

// ============================================================================
// MUTATIONS TEMPLATES
// ============================================================================

export function useCreatePlanTemplate() {
  const queryClient = useQueryClient();
  const { agence } = useAuth();

  return useMutation({
    mutationFn: async (data: MaintenancePlanTemplateFormData) => {
      if (!agence) throw new Error('Agence non définie');

      const result = await safeMutation<MaintenancePlanTemplate[]>(
        supabase
          .from('maintenance_plan_templates')
          .insert({
            agency_id: agence,
            ...data,
          })
          .select(),
        'MAINTENANCE_PLAN_TEMPLATE_CREATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur création plan');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdatePlanTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, data }: { planId: string; data: Partial<MaintenancePlanTemplateFormData> }) => {
      const result = await safeMutation<MaintenancePlanTemplate[]>(
        supabase
          .from('maintenance_plan_templates')
          .update(data)
          .eq('id', planId)
          .select(),
        'MAINTENANCE_PLAN_TEMPLATE_UPDATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour plan');
      }
      return result.data?.[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', variables.planId] });
    },
  });
}

export function useDeletePlanTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await safeMutation(
        supabase
          .from('maintenance_plan_templates')
          .delete()
          .eq('id', planId),
        'MAINTENANCE_PLAN_TEMPLATE_DELETE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur suppression plan');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ============================================================================
// MUTATIONS ITEMS
// ============================================================================

export function useCreatePlanItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planTemplateId, data }: { planTemplateId: string; data: MaintenancePlanItemFormData }) => {
      const result = await safeMutation<MaintenancePlanItem[]>(
        supabase
          .from('maintenance_plan_items')
          .insert({
            plan_template_id: planTemplateId,
            ...data,
          })
          .select(),
        'MAINTENANCE_PLAN_ITEM_CREATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur création item plan');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdatePlanItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<MaintenancePlanItemFormData> }) => {
      const result = await safeMutation<MaintenancePlanItem[]>(
        supabase
          .from('maintenance_plan_items')
          .update(data)
          .eq('id', itemId)
          .select(),
        'MAINTENANCE_PLAN_ITEM_UPDATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour item plan');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeletePlanItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const result = await safeMutation(
        supabase
          .from('maintenance_plan_items')
          .delete()
          .eq('id', itemId),
        'MAINTENANCE_PLAN_ITEM_DELETE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur suppression item plan');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// ============================================================================
// APPLY PLAN TO ASSET
// ============================================================================

export function useApplyPlanToAsset() {
  const queryClient = useQueryClient();
  const { agence } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      planTemplateId, 
      targetType, 
      targetId 
    }: { 
      planTemplateId: string; 
      targetType: MaintenanceTargetType; 
      targetId: string;
    }) => {
      if (!agence) throw new Error('Agence non définie');

      // 1. Récupérer le plan avec ses items
      const planResult = await safeQuery<MaintenancePlanTemplate[]>(
        supabase
          .from('maintenance_plan_templates')
          .select(`
            *,
            items:maintenance_plan_items(*)
          `)
          .eq('id', planTemplateId)
          .limit(1),
        'MAINTENANCE_PLAN_FETCH_FOR_APPLY'
      );

      if (!planResult.success || !planResult.data?.[0]) {
        throw new Error('Plan non trouvé');
      }

      const plan = planResult.data[0];
      const items = plan.items || [];

      if (items.length === 0) {
        throw new Error('Le plan ne contient aucun item');
      }

      // 2. Créer les événements de maintenance pour chaque item
      const today = new Date();
      const events = items.map(item => ({
        agency_id: agence,
        target_type: targetType,
        vehicle_id: targetType === 'vehicle' ? targetId : null,
        tool_id: targetType === 'tool' ? targetId : null,
        plan_item_id: item.id,
        label: item.label,
        scheduled_at: format(
          addDays(today, item.first_due_after_days || 0), 
          'yyyy-MM-dd'
        ),
        status: 'scheduled' as const,
      }));

      const insertResult = await safeMutation(
        supabase
          .from('maintenance_events')
          .insert(events),
        'MAINTENANCE_EVENTS_APPLY_PLAN'
      );

      if (!insertResult.success) {
        throw new Error(insertResult.error?.message || 'Erreur application du plan');
      }

      // 3. Si c'est un outil, mettre à jour le default_plan_template_id
      if (targetType === 'tool') {
        await safeMutation(
          supabase
            .from('tools')
            .update({ default_plan_template_id: planTemplateId })
            .eq('id', targetId),
          'TOOL_UPDATE_DEFAULT_PLAN'
        );
      }

      return { eventsCreated: events.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-events'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}
