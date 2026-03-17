/**
 * useOverheadMutations — CRUD for agency overhead rules.
 * Validation is status-only (no validated_by/validated_at on this table).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import {
  upsertOverheadRule,
  deleteOverheadRule,
  updateOverheadRuleValidation,
} from '@/repositories/profitabilityRepository';
import type { AgencyOverheadRule, CostValidation } from '@/types/projectProfitability';
import { toast } from 'sonner';

export function useOverheadMutations() {
  const { agencyId } = useEffectiveAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['overhead-rules', agencyId] });
    qc.invalidateQueries({ queryKey: ['project-profitability'] });
  };

  const upsertMutation = useMutation({
    mutationFn: (data: Partial<AgencyOverheadRule> & { agency_id: string; cost_type: string }) =>
      upsertOverheadRule(data),
    onSuccess: () => {
      invalidate();
      toast.success('Règle de charge enregistrée');
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOverheadRule(id),
    onSuccess: () => {
      invalidate();
      toast.success('Règle supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CostValidation }) =>
      updateOverheadRuleValidation(id, status),
    onSuccess: () => {
      invalidate();
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  return {
    upsertRule: upsertMutation,
    deleteRule: deleteMutation,
    validateRule: validateMutation,
    agencyId,
  };
}
