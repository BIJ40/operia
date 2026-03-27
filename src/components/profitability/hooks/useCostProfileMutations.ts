/**
 * useCostProfileMutations — Upsert employee cost profiles.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { upsertCostProfile } from '@/repositories/profitabilityRepository';
import type { EmployeeCostProfile } from '@/types/projectProfitability';
import { toast } from 'sonner';
import { syncCostProfileToSalaryHistory } from '@/services/salaryCostSync';

export function useCostProfileMutations() {
  const { agencyId } = useEffectiveAuth();
  const qc = useQueryClient();

  const upsertMutation = useMutation({
    mutationFn: (data: Partial<EmployeeCostProfile> & { agency_id: string; collaborator_id: string }) =>
      upsertCostProfile(data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['project-profitability'] });
      qc.invalidateQueries({ queryKey: ['salary-history'] });
      toast.success('Profil coût mis à jour');

      // Sync to salary_history (fire-and-forget)
      if (variables.collaborator_id && variables.effective_from) {
        syncCostProfileToSalaryHistory({
          collaboratorId: variables.collaborator_id,
          salaryGrossMonthly: variables.salary_gross_monthly ?? null,
          loadedHourlyCost: variables.loaded_hourly_cost ?? null,
          effectiveDate: variables.effective_from,
        });
      }
    },
    onError: () => toast.error('Erreur lors de la mise à jour du profil coût'),
  });

  return {
    upsertProfile: upsertMutation,
    agencyId,
  };
}
