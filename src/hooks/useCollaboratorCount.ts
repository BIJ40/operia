/**
 * useCollaboratorCount — Returns the count of active collaborators for the current agency
 * Used to auto-populate "nombre de salariés" in the financial module
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCollaboratorCount() {
  const { agencyId } = useAuth();

  const query = useQuery({
    queryKey: ['collaborator-count', agencyId],
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      const { count, error } = await supabase
        .from('collaborators')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId!)
        .is('leaving_date', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
  };
}
