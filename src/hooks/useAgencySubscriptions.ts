/**
 * Hook pour récupérer les abonnements actifs d'une agence
 * Remplace la logique de permissions V2 pour le modèle Freemium
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

export type PlanKey = 'pilotage' | 'suivi';

interface Subscription {
  plan_key: PlanKey;
  status: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
}

interface AgencySubscriptionsResult {
  subscriptions: Subscription[];
  hasPilotage: boolean;
  hasSuivi: boolean;
  isLoading: boolean;
}

export function useAgencySubscriptions(): AgencySubscriptionsResult {
  const { agencyId } = useProfile();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['agency-subscriptions', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan_key, status, current_period_end, stripe_subscription_id')
        .eq('agency_id', agencyId)
        .in('status', ['active', 'past_due']);
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
    enabled: !!agencyId,
    staleTime: 60_000,
  });

  return {
    subscriptions,
    hasPilotage: subscriptions.some(s => s.plan_key === 'pilotage'),
    hasSuivi: subscriptions.some(s => s.plan_key === 'suivi'),
    isLoading,
  };
}
