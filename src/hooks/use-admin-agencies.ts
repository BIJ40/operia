/**
 * Hook simple pour récupérer toutes les agences actives
 * À utiliser dans les pages admin (sans dépendance à FranchiseurContext)
 * 
 * MIGRATED: Uses agencyRepository for data access
 */

import { useQuery } from '@tanstack/react-query';
import { listAgencies } from '@/repositories/agencyRepository';

export function useAdminAgencies() {
  return useQuery({
    queryKey: ['admin-agencies'],
    queryFn: () => listAgencies({ activeOnly: true }),
  });
}
