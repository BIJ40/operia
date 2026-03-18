/**
 * useCollaboratorCount — Returns counts of active collaborators by category
 * Productifs = TECHNICIEN, Improductifs = ASSISTANTE + DIRIGEANT + COMMERCIAL + APPRENTI
 * Also computes monthly paid hours from employment contracts
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PRODUCTIVE_TYPES = ['TECHNICIEN'];

export interface CollaboratorCounts {
  total: number;
  productifs: number;
  improductifs: number;
  /** Monthly paid hours for productifs (weekly_hours × 52/12) */
  heuresPayeesProductifs: number;
  /** Monthly paid hours for improductifs */
  heuresPayeesImproductifs: number;
}

export function useCollaboratorCount() {
  const { agencyId } = useAuth();

  const query = useQuery({
    queryKey: ['collaborator-counts', agencyId],
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CollaboratorCounts> => {
      // Get active collaborators with their type
      const { data: collabs, error: collabError } = await supabase
        .from('collaborators')
        .select('id, type')
        .eq('agency_id', agencyId!)
        .is('leaving_date', null);
      if (collabError) throw collabError;

      const list = collabs ?? [];
      const productifIds = list.filter(c => PRODUCTIVE_TYPES.includes(c.type ?? '')).map(c => c.id);
      const improductifIds = list.filter(c => !PRODUCTIVE_TYPES.includes(c.type ?? '')).map(c => c.id);

      // Get current contracts for weekly hours
      let heuresProductifs = 0;
      let heuresImproductifs = 0;

      if (list.length > 0) {
        const { data: contracts, error: contractError } = await supabase
          .from('employment_contracts')
          .select('collaborator_id, weekly_hours')
          .eq('agency_id', agencyId!)
          .eq('is_current', true);
        if (!contractError && contracts) {
          for (const c of contracts) {
            const monthlyHours = ((c.weekly_hours ?? 35) * 52) / 12;
            if (productifIds.includes(c.collaborator_id)) {
              heuresProductifs += monthlyHours;
            } else {
              heuresImproductifs += monthlyHours;
            }
          }
        }
      }

      return {
        total: list.length,
        productifs: productifIds.length,
        improductifs: improductifIds.length,
        heuresPayeesProductifs: Math.round(heuresProductifs * 100) / 100,
        heuresPayeesImproductifs: Math.round(heuresImproductifs * 100) / 100,
      };
    },
  });

  return {
    count: query.data?.total ?? 0,
    counts: query.data ?? { total: 0, productifs: 0, improductifs: 0, heuresPayeesProductifs: 0, heuresPayeesImproductifs: 0 },
    isLoading: query.isLoading,
  };
}
