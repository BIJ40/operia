/**
 * useDocumentUpload — Upload files to project-documents bucket + insert DB records.
 * Validation of documents never auto-creates costs or profiles (Phase 2 manual workflow).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  insertProjectCostDocument,
  insertSalaryDocument,
  updateProjectCostDocumentValidation,
  updateSalaryDocumentValidation,
} from '@/repositories/profitabilityRepository';
import type { ValidationStatus } from '@/types/projectProfitability';
import { toast } from 'sonner';

export function useDocumentUpload(projectId: string) {
  const { agencyId } = useEffectiveAuth();
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidateDocs = () => {
    qc.invalidateQueries({ queryKey: ['project-cost-documents', agencyId, projectId] });
    qc.invalidateQueries({ queryKey: ['salary-documents', agencyId] });
  };

  /** Upload a file to the project-documents bucket and return the storage path */
  async function uploadFile(file: File, subPath: string): Promise<string> {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${subPath}/${timestamp}_${safeName}`;

    const { error } = await supabase.storage
      .from('project-documents')
      .upload(path, file);

    if (error) throw error;
    return path;
  }

  /** Upload supplier invoice document */
  const uploadCostDocument = useMutation({
    mutationFn: async (file: File) => {
      if (!agencyId) throw new Error('No agency');
      const filePath = await uploadFile(file, `${agencyId}/${projectId}`);
      return insertProjectCostDocument({
        agency_id: agencyId,
        project_id: projectId,
        file_path: filePath,
        extraction_status: 'pending',
        validation_status: 'pending',
        created_by: user?.id ?? null,
        extracted_ht: null,
        extracted_vat: null,
        extracted_ttc: null,
        extracted_date: null,
        extracted_supplier: null,
        extracted_data_json: null,
        linked_cost_id: null,
      });
    },
    onSuccess: () => {
      invalidateDocs();
      toast.success('Document facture uploadé');
    },
    onError: () => toast.error('Erreur lors de l\'upload'),
  });

  /** Upload salary document */
  const uploadSalaryDocument = useMutation({
    mutationFn: async ({ file, collaboratorId }: { file: File; collaboratorId: string }) => {
      if (!agencyId) throw new Error('No agency');
      const filePath = await uploadFile(file, `${agencyId}/salaries/${collaboratorId}`);
      return insertSalaryDocument({
        agency_id: agencyId,
        collaborator_id: collaboratorId,
        file_path: filePath,
        period_month: null,
        extraction_status: 'pending',
        validation_status: 'pending',
        created_by: user?.id ?? null,
        extracted_gross_salary: null,
        extracted_net_salary: null,
        extracted_employer_cost: null,
        extracted_hours: null,
        extracted_data_json: null,
        validated_by: null,
        validated_at: null,
      });
    },
    onSuccess: () => {
      invalidateDocs();
      toast.success('Bulletin uploadé');
    },
    onError: () => toast.error('Erreur lors de l\'upload du bulletin'),
  });

  /** Validate/reject a project cost document (no auto-creation of cost) */
  const validateCostDocument = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ValidationStatus }) =>
      updateProjectCostDocumentValidation(id, status),
    onSuccess: () => {
      invalidateDocs();
      toast.success('Statut du document mis à jour');
    },
    onError: () => toast.error('Erreur de validation'),
  });

  /** Validate/reject a salary document (no auto-creation of profile) */
  const validateSalaryDocument = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ValidationStatus }) => {
      if (!user?.id) throw new Error('Not authenticated');
      return updateSalaryDocumentValidation(id, status, user.id);
    },
    onSuccess: () => {
      invalidateDocs();
      toast.success('Statut du bulletin mis à jour');
    },
    onError: () => toast.error('Erreur de validation'),
  });

  return {
    uploadCostDocument,
    uploadSalaryDocument,
    validateCostDocument,
    validateSalaryDocument,
    agencyId,
  };
}
