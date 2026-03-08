/**
 * Hooks pour la gestion des contrats et salaires - Phase 2 RH
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmploymentContract, SalaryHistory } from '@/types/collaborator';
import { toast } from 'sonner';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { useProfile } from '@/contexts/ProfileContext';

export function useEmploymentContracts(collaboratorId: string | undefined) {
  const queryClient = useQueryClient();
  const canManage = useHasMinLevel(2);
  const { agencyId } = useProfile();

  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ['employment-contracts', collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      const { data, error } = await supabase
        .from('employment_contracts')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as EmploymentContract[];
    },
    enabled: !!collaboratorId,
  });

  const currentContract = contracts.find((c) => c.is_current) ?? null;
  const pastContracts = contracts.filter((c) => !c.is_current);

  const createContract = useMutation({
    mutationFn: async (
      payload: Omit<EmploymentContract, 'id' | 'created_at' | 'created_by' | 'agency_id'>
    ) => {
      if (!agencyId) throw new Error('Agence requise');

      const { data, error } = await supabase
        .from('employment_contracts')
        .insert({
          ...payload,
          agency_id: agencyId,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as EmploymentContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employment-contracts', collaboratorId] });
      toast.success('Contrat créé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur contrat: ${error.message}`);
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmploymentContract> }) => {
      const { data: result, error } = await supabase
        .from('employment_contracts')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return result as EmploymentContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employment-contracts', collaboratorId] });
      toast.success('Contrat mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur contrat: ${error.message}`);
    },
  });

  const closeContract = useMutation({
    mutationFn: async ({ id, end_date }: { id: string; end_date: string }) => {
      const { data: result, error } = await supabase
        .from('employment_contracts')
        .update({
          end_date,
          is_current: false,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return result as EmploymentContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employment-contracts', collaboratorId] });
      toast.success('Contrat clôturé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur clôture contrat: ${error.message}`);
    },
  });

  return {
    contracts,
    currentContract,
    pastContracts,
    isLoading,
    error,
    canManage,
    createContract,
    updateContract,
    closeContract,
  };
}

export function useSalaryHistory(contractId: string | undefined) {
  const queryClient = useQueryClient();
  const canManage = useHasMinLevel(2);

  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ['salary-history', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from('salary_history')
        .select('*')
        .eq('contract_id', contractId)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      return data as SalaryHistory[];
    },
    enabled: !!contractId,
  });

  const currentSalary = history[0] ?? null;

  const createSalaryEntry = useMutation({
    mutationFn: async (
      payload: Omit<SalaryHistory, 'id' | 'created_at'>
    ) => {
      const { data, error } = await supabase
        .from('salary_history')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data as SalaryHistory;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salary-history', variables.contract_id] });
      toast.success('Entrée de salaire ajoutée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur salaire: ${error.message}`);
    },
  });

  const updateSalaryEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalaryHistory> }) => {
      const { data: result, error } = await supabase
        .from('salary_history')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return result as SalaryHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-history', contractId] });
      toast.success('Entrée de salaire mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur mise à jour salaire: ${error.message}`);
    },
  });

  const deleteSalaryEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salary_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-history', contractId] });
      toast.success('Entrée de salaire supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur suppression: ${error.message}`);
    },
  });

  return {
    history,
    currentSalary,
    isLoading,
    error,
    canManage,
    createSalaryEntry,
    updateSalaryEntry,
    deleteSalaryEntry,
  };
}
