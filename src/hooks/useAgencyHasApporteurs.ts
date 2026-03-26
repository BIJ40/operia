import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from './useEffectiveAuth';

/**
 * Returns true if the current agency has at least one apporteur configured.
 * Used to conditionally show apporteur-related modules in rights management.
 */
export function useAgencyHasApporteurs(): boolean {
  const { agencyId } = useEffectiveAuth();

  const { data } = useQuery({
    queryKey: ['agency-has-apporteurs', agencyId],
    queryFn: async () => {
      if (!agencyId) return false;
      const { count, error } = await supabase
        .from('apporteurs')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .limit(1);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!agencyId,
    staleTime: 5 * 60_000,
  });

  return data ?? false;
}
