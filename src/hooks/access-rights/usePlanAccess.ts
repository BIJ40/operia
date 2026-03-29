/**
 * Hook pour vérifier l'accès basé sur le plan agence
 * Phase 6 du Plan de Simplification V3.0
 */

import { useProfile } from '@/contexts/ProfileContext';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { useAgencySubscription } from './useAgencySubscription';
import { PlanKey, PLAN_LABELS } from '@/config/planTiers';

/**
 * Hiérarchie des plans (niveau croissant)
 */
const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
};

export interface PlanAccessResult {
  /** L'utilisateur a-t-il un plan suffisant ? */
  hasRequiredPlan: boolean;
  /** Le plan actuel de l'agence */
  currentPlan: PlanKey | null;
  /** Label du plan actuel */
  currentPlanLabel: string;
  /** Plan requis pour la fonctionnalité */
  requiredPlan: PlanKey | null;
  /** Label du plan requis */
  requiredPlanLabel: string;
  /** L'utilisateur a-t-il un bypass (N5+) ? */
  isBypass: boolean;
  /** Chargement en cours ? */
  isLoading: boolean;
}

/**
 * Vérifie si un plan atteint le niveau minimum requis
 */
export function isPlanSufficient(
  currentPlan: string | null | undefined, 
  requiredPlan: PlanKey
): boolean {
  if (!currentPlan) return false;
  
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? -1;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;
  
  return currentLevel >= requiredLevel;
}

/**
 * Hook pour vérifier l'accès à une fonctionnalité basée sur le plan agence
 * 
 * @param requiredPlan - Plan minimum requis (STARTER, PRO, etc.)
 * @returns Résultat de la vérification d'accès
 * 
 * @example
 * const { hasRequiredPlan, currentPlanLabel, requiredPlanLabel } = usePlanAccess('PRO');
 * if (!hasRequiredPlan) {
 *   return <UpgradePrompt from={currentPlanLabel} to={requiredPlanLabel} />;
 * }
 */
export function usePlanAccess(requiredPlan: PlanKey | null | undefined): PlanAccessResult {
  const { agencyId } = useProfile();
  const { globalRole } = usePermissions();
  const { data: subscription, isLoading } = useAgencySubscription(agencyId);
  
  // N5+ bypass: accès à tout
  const isBypass = globalRole === 'platform_admin' || globalRole === 'superadmin';
  
  // Si pas de plan requis, accès autorisé
  if (!requiredPlan) {
    return {
      hasRequiredPlan: true,
      currentPlan: (subscription?.tier_key as PlanKey) || null,
      currentPlanLabel: subscription?.plan_tiers?.label || 'Aucun',
      requiredPlan: null,
      requiredPlanLabel: '',
      isBypass,
      isLoading,
    };
  }
  
  // Bypass pour N5+
  if (isBypass) {
    return {
      hasRequiredPlan: true,
      currentPlan: (subscription?.tier_key as PlanKey) || null,
      currentPlanLabel: subscription?.plan_tiers?.label || 'N/A (Admin)',
      requiredPlan,
      requiredPlanLabel: PLAN_LABELS[requiredPlan] || requiredPlan,
      isBypass: true,
      isLoading,
    };
  }
  
  // Pas d'agence = pas de plan
  if (!agencyId) {
    return {
      hasRequiredPlan: false,
      currentPlan: null,
      currentPlanLabel: 'Aucune agence',
      requiredPlan,
      requiredPlanLabel: PLAN_LABELS[requiredPlan] || requiredPlan,
      isBypass: false,
      isLoading,
    };
  }
  
  const currentPlan = (subscription?.tier_key as PlanKey) || null;
  const hasRequiredPlan = isPlanSufficient(currentPlan, requiredPlan);
  
  return {
    hasRequiredPlan,
    currentPlan,
    currentPlanLabel: subscription?.plan_tiers?.label || PLAN_LABELS[currentPlan as PlanKey] || 'Non défini',
    requiredPlan,
    requiredPlanLabel: PLAN_LABELS[requiredPlan] || requiredPlan,
    isBypass: false,
    isLoading,
  };
}

/**
 * Fonction utilitaire (non-hook) pour vérifier l'accès au plan
 * Utilisable dans les guards/routes
 */
export function checkPlanAccess(
  userPlan: string | null | undefined,
  requiredPlan: PlanKey | null | undefined,
  globalRole: string | null | undefined
): boolean {
  // Pas de plan requis = accès autorisé
  if (!requiredPlan) return true;
  
  // N5+ bypass
  if (globalRole === 'platform_admin' || globalRole === 'superadmin') {
    return true;
  }
  
  // Vérifier le plan
  return isPlanSufficient(userPlan, requiredPlan);
}
