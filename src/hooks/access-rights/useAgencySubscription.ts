/**
 * Hook pour gérer les souscriptions d'agence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgencySubscription {
  id: string;
  agency_id: string;
  tier_key: string;
  status: 'active' | 'suspended' | 'cancelled';
  valid_from: string;
  valid_until: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  plan_tiers?: {
    key: string;
    label: string;
    description: string | null;
    display_order: number;
  };
}

export function useAgencySubscription(agencyId: string | null) {
  return useQuery({
    queryKey: ['agency-subscription', agencyId],
    queryFn: async (): Promise<AgencySubscription | null> => {
      if (!agencyId) return null;
      
      const { data, error } = await (supabase
        .from('agency_subscription' as any) as any)
        .select('*, plan_tiers(*)')
        .eq('agency_id', agencyId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as AgencySubscription | null;
    },
    enabled: !!agencyId,
  });
}

export function useAllAgencySubscriptions() {
  return useQuery({
    queryKey: ['agency-subscriptions-all'],
    queryFn: async (): Promise<AgencySubscription[]> => {
      const { data, error } = await (supabase
        .from('agency_subscription' as any) as any)
        .select('*, plan_tiers(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as AgencySubscription[];
    },
  });
}

export function useUpdateAgencySubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ agencyId, tierKey }: { agencyId: string; tierKey: string }) => {
      const { data, error } = await supabase
        .from('agency_subscription')
        .upsert({
          agency_id: agencyId,
          tier_key: tierKey,
          status: 'active',
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
        }, {
          onConflict: 'agency_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agency-subscription', variables.agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-subscriptions-all'] });
      toast.success('Plan de l\'agence mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
