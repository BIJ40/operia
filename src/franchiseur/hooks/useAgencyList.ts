import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFranchiseur } from '../contexts/FranchiseurContext';

export function useAgencyList() {
  const { franchiseurRole } = useFranchiseur();

  return useQuery({
    queryKey: ['franchiseur-agencies', franchiseurRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('*')
        .eq('is_active', true)
        .order('label')
        .limit(500);

      if (error) throw error;
      return data;
    },
    enabled: !!franchiseurRole,
  });
}
