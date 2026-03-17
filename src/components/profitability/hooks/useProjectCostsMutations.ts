/**
 * useProjectCostsMutations — CRUD + validation for project_costs.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useAuth } from '@/contexts/AuthContext';
import {
  insertProjectCost,
  updateProjectCost,
  deleteProjectCost,
  updateProjectCostValidation,
} from '@/repositories/profitabilityRepository';
import type { ProjectCost, CostValidation } from '@/types/projectProfitability';
import { toast } from 'sonner';

export function useProjectCostsMutations(projectId: string) {
  const { agencyId } = useEffectiveAuth();
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['project-profitability', agencyId, projectId] });
    qc.invalidateQueries({ queryKey: ['project-profitability-snapshot', agencyId, projectId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Omit<ProjectCost, 'id' | 'created_at' | 'updated_at'>) =>
      insertProjectCost(data),
    onSuccess: () => {
      invalidate();
      toast.success('Coût ajouté');
    },
    onError: () => toast.error('Erreur lors de l\'ajout du coût'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectCost> }) =>
      updateProjectCost(id, updates),
    onSuccess: () => {
      invalidate();
      toast.success('Coût modifié');
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectCost(id),
    onSuccess: () => {
      invalidate();
      toast.success('Coût supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CostValidation }) =>
      updateProjectCostValidation(id, status, user?.id ?? ''),
    onSuccess: () => {
      invalidate();
      toast.success('Statut de validation mis à jour');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  return {
    createCost: createMutation,
    updateCost: updateMutation,
    deleteCost: deleteMutation,
    validateCost: validateMutation,
    agencyId,
  };
}
