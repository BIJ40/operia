import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KpiData {
  agency: {
    slug: string;
    label: string;
  };
  period: {
    type: string;
    start: string;
    end: string;
  };
  kpis: {
    ca_period: number;
    invoices_count: number;
    avg_invoice: number;
    apporteurs_rate: number;
    projects_in_progress: number;
    interventions_today: number;
    sav_rate: number;
    interventions_count: number;
    devis_count: number;
    projects_count: number;
    conversion_rate: number;
    active_technicians: number;
  };
  details: {
    ca_by_universe: Array<{ universe: string; amount: number }>;
    ca_by_apporteur_type: Array<{ type: string; amount: number }>;
    ca_by_technician: Array<{ name: string; amount: number; interventions: number }>;
    invoices_history: Array<{ date: string; amount: number }>;
    apporteurs: Array<{ name: string; ca: number; projects: number; type: string }>;
    technicians: Array<{
      name: string;
      ca: number;
      interventions: number;
      sav: number;
      universes: Array<{ universe: string; amount: number }>;
    }>;
  };
}

interface UseAgencyKpisParams {
  period?: 'day' | 'yesterday' | 'week' | 'month' | 'year' | 'rolling12';
}

export function useAgencyKpis({ period = 'month' }: UseAgencyKpisParams = {}) {
  return useQuery<KpiData>({
    queryKey: ['agency-kpis', period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-kpis', {
        body: { period },
      });

      if (error) {
        console.error('Error fetching KPIs:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
