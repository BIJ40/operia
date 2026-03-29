/**
 * Hook pour vérifier l'accès basé sur le plan agence (V2)
 * Utilise agency_plan + plan_catalog via Supabase
 */

import { useProfile } from '@/contexts/ProfileContext';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_HIERARCHY, PLAN_LABELS, getPlanLabel } from '@/permissions/shared-constants';

export type PlanKey = string;

export interface PlanAccessResult {
  hasRequiredPlan: boolean;
  currentPlan: string | null;
  currentPlanLabel: string;
  requiredPlan: string | null;
  requiredPlanLabel: string;
  isBypass: boolean;
  isLoading: boolean;
}

function isPlanSufficient(currentPlan: string | null | undefined, requiredPlan: string): boolean {
  if (!currentPlan) return false;
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? -1;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;
  return currentLevel >= requiredLevel;
}

function useAgencyPlanV2(agencyId: string | null) {
  return useQuery({
    queryKey: ['agency-plan-v2', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from('agency_plan')
        .select('plan_id, status, plan_catalog:plan_id(id, name, slug)')
        .eq('agency_id', agencyId)
        .eq('status', 'active')
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
    staleTime: 5 * 60_000,
  });
}

export function usePlanAccess(requiredPlan: string | null | undefined): PlanAccessResult {
  const { agencyId } = useProfile();
  const { globalRole } = usePermissions();
  const { data: planData, isLoading } = useAgencyPlanV2(agencyId);

  const isBypass = globalRole === 'platform_admin' || globalRole === 'superadmin';
  const planCatalog = planData?.plan_catalog as any;
  const currentPlanSlug = planCatalog?.slug?.toUpperCase() || null;

  if (!requiredPlan) {
    return {
      hasRequiredPlan: true,
      currentPlan: currentPlanSlug,
      currentPlanLabel: planCatalog?.name || 'Aucun',
      requiredPlan: null,
      requiredPlanLabel: '',
      isBypass,
      isLoading,
    };
  }

  if (isBypass) {
    return {
      hasRequiredPlan: true,
      currentPlan: currentPlanSlug,
      currentPlanLabel: planCatalog?.name || 'N/A (Admin)',
      requiredPlan,
      requiredPlanLabel: getPlanLabel(requiredPlan),
      isBypass: true,
      isLoading,
    };
  }

  if (!agencyId) {
    return {
      hasRequiredPlan: false,
      currentPlan: null,
      currentPlanLabel: 'Aucune agence',
      requiredPlan,
      requiredPlanLabel: getPlanLabel(requiredPlan),
      isBypass: false,
      isLoading,
    };
  }

  return {
    hasRequiredPlan: isPlanSufficient(currentPlanSlug, requiredPlan),
    currentPlan: currentPlanSlug,
    currentPlanLabel: planCatalog?.name || getPlanLabel(currentPlanSlug || '') || 'Non défini',
    requiredPlan,
    requiredPlanLabel: getPlanLabel(requiredPlan),
    isBypass: false,
    isLoading,
  };
}

export function checkPlanAccess(
  userPlan: string | null | undefined,
  requiredPlan: string | null | undefined,
  globalRole: string | null | undefined
): boolean {
  if (!requiredPlan) return true;
  if (globalRole === 'platform_admin' || globalRole === 'superadmin') return true;
  return isPlanSufficient(userPlan, requiredPlan);
}
