/**
 * Hook simple pour récupérer toutes les agences actives
 * À utiliser dans les pages admin (sans dépendance à FranchiseurContext)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAgencies() {
  return useQuery({
    queryKey: ['admin-agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('*')
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return data;
    },
  });
}
