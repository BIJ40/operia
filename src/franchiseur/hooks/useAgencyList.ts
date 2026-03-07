import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFranchiseur } from '../contexts/FranchiseurContext';

export function useAgencyList() {
  const { assignedAgencies, franchiseurRole } = useFranchiseur();

  return useQuery({
    queryKey: ['franchiseur-agencies', franchiseurRole, assignedAgencies],
    queryFn: async () => {
      let query = supabase
        .from('apogee_agencies')
        .select('*')
        .eq('is_active', true)
        .order('label')
        .limit(500);

      // If animateur, filter by assigned agencies
      if (franchiseurRole === 'animateur' && assignedAgencies.length > 0) {
        query = query.in('id', assignedAgencies);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!franchiseurRole,
  });
}
