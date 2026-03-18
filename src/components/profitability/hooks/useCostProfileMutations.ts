/**
 * useCostProfileMutations — Upsert employee cost profiles.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { upsertCostProfile } from '@/repositories/profitabilityRepository';
import type { EmployeeCostProfile } from '@/types/projectProfitability';
import { toast } from 'sonner';

export function useCostProfileMutations() {
  const { agencyId } = useEffectiveAuth();
  const qc = useQueryClient();

  const upsertMutation = useMutation({
    mutationFn: (data: Partial<EmployeeCostProfile> & { agency_id: string; collaborator_id: string }) =>
      upsertCostProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-profitability'] });
      toast.success('Profil coût mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour du profil coût'),
  });

  return {
    upsertProfile: upsertMutation,
    agencyId,
  };
}
