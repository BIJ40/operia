import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgencyKpis {
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
    ca_month: number;
    ca_year: number;
    invoices_count_month: number;
    interventions_count_month: number;
  };
}

interface UseAgencyKpisOptions {
  period?: 'month' | 'year';
}

interface UseAgencyKpisReturn {
  data: AgencyKpis | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgencyKpis(options?: UseAgencyKpisOptions): UseAgencyKpisReturn {
  const [data, setData] = useState<AgencyKpis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchKpis = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('get-kpis', {
        body: { period: options?.period || 'month' },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result as AgencyKpis);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setIsError(true);
      console.error('[use-metrics] Error fetching KPIs:', errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [options?.period]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchKpis,
  };
}
