/**
 * Hooks pour la gestion des documents RH - Phase 2.1
 * Avec analyse automatique des bulletins de paie
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CollaboratorDocument, CollaboratorDocumentFormData } from '@/types/collaboratorDocument';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { useAuth } from '@/contexts/AuthContext';
import { useLogRHAction } from '@/hooks/rh/useRHAuditLog';
import { validateFile } from '@/utils/fileValidation';
import { handleRHError, showRHSuccess, showRHInfo } from '@/utils/rhErrorHandler';
import { logError, logDebug } from '@/lib/logger';

const BUCKET_NAME = 'rh-documents';

// P0-04: Expiration réduite à 15 minutes pour sécurité renforcée
const SIGNED_URL_EXPIRATION = 900; // 15 minutes

/**
 * Génère une URL signée pour télécharger un fichier (partagé entre hooks)
 * P0-04: Expiration 15 min + logging accès
 */
async function createSignedDownloadUrl(
  filePath: string,
  documentId?: string,
  accessType: 'view' | 'download' | 'preview' = 'view'
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRATION);

  if (error) {
    handleRHError(error, 'DOWNLOAD_FAILED', { filePath });
    return null;
  }

  // Log access if documentId provided (fire-and-forget)
  if (documentId) {
    supabase.rpc('log_document_access', {
      p_document_id: documentId,
      p_access_type: accessType,
    }).then(({ error: logError }) => {
      if (logError) console.warn('Failed to log document access:', logError);
    });
  }

  return data.signedUrl;
}

/**
 * Déclenche l'analyse automatique d'un bulletin de paie (async, non-bloquant)
 */
async function triggerPayslipAnalysis(
  documentId: string,
  filePath: string,
  collaboratorId: string,
  agencyId: string
) {
  try {
    // Appel non-bloquant - on n'attend pas le résultat
    supabase.functions.invoke('analyze-payslip', {
      body: { documentId, filePath, collaboratorId, agencyId },
    }).then(({ data, error }) => {
      if (error) {
        logError('[triggerPayslipAnalysis] Erreur analyse bulletin (async):', error);
      } else if (data?.success) {
        logDebug('[triggerPayslipAnalysis] Bulletin analysé:', documentId);
      }
    });
  } catch (err) {
    logError('[triggerPayslipAnalysis] Erreur déclenchement:', err);
  }
}

export function useCollaboratorDocuments(collaboratorId: string | undefined) {
  const queryClient = useQueryClient();
  const canManage = useHasMinLevel(2);
  const { agencyId, user } = useAuth();
  const logAction = useLogRHAction();

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['collaborator-documents', collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CollaboratorDocument[];
    },
    enabled: !!collaboratorId,
  });

  const uploadDocument = useMutation({
    mutationFn: async (formData: CollaboratorDocumentFormData & { collaborator_id: string }) => {
      if (!agencyId) throw new Error('Agence requise');
      if (!user?.id) throw new Error('Utilisateur requis');

      // RH-P1-02: Validate file before upload
      const validation = validateFile(formData.file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 1) Upload file to storage
      const fileExt = formData.file.name.split('.').pop();
      const filePath = `${formData.collaborator_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, formData.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2) Create document record
      const { data, error } = await supabase
        .from('collaborator_documents')
        .insert({
          collaborator_id: formData.collaborator_id,
          agency_id: agencyId,
          doc_type: formData.doc_type,
          title: formData.title,
          description: formData.description || null,
          file_path: filePath,
          file_name: formData.file.name,
          file_size: formData.file.size,
          file_type: formData.file.type,
          period_month: formData.period_month || null,
          period_year: formData.period_year || null,
          visibility: formData.visibility,
          subfolder: formData.subfolder || null,
          uploaded_by: user.id,
        })
        .select('*')
        .single();

      if (error) {
        // Rollback: delete uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        throw error;
      }

      const doc = data as CollaboratorDocument;

      // 3) Si c'est un bulletin de paie PDF, déclencher l'analyse automatique
      if (formData.doc_type === 'PAYSLIP' && formData.file.type === 'application/pdf') {
        triggerPayslipAnalysis(doc.id, filePath, formData.collaborator_id, agencyId);
        showRHInfo('Analyse du bulletin en cours...');
      }

      return doc;
    },
    onSuccess: (doc, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', variables.collaborator_id] });
      // Log audit
      logAction.mutate({
        actionType: 'DOCUMENT_UPLOAD',
        entityType: 'document',
        collaboratorId: variables.collaborator_id,
        entityId: doc.id,
        newValues: { title: doc.title, doc_type: doc.doc_type },
        metadata: { filename: doc.file_name, fileSize: doc.file_size },
      });
      showRHSuccess('Document ajouté');
    },
    onError: (error: Error) => {
      handleRHError(error, 'UPLOAD_FAILED', { showToast: true });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CollaboratorDocument> }) => {
      const { data: result, error } = await supabase
        .from('collaborator_documents')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return result as CollaboratorDocument;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', collaboratorId] });
      // Log audit
      logAction.mutate({
        actionType: 'DOCUMENT_UPDATE',
        entityType: 'document',
        collaboratorId: result.collaborator_id,
        entityId: variables.id,
        newValues: variables.data,
      });
      showRHSuccess('Document mis à jour');
    },
    onError: (error: Error) => {
      handleRHError(error, 'UPDATE_FAILED', { showToast: true });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: CollaboratorDocument) => {
      // 1) Delete from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([doc.file_path]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // 2) Delete from database
      const { error } = await supabase
        .from('collaborator_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: (_, doc) => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', collaboratorId] });
      // Log audit
      logAction.mutate({
        actionType: 'DOCUMENT_DELETE',
        entityType: 'document',
        collaboratorId: doc.collaborator_id,
        entityId: doc.id,
        oldValues: { title: doc.title, doc_type: doc.doc_type },
        metadata: { filename: doc.file_name },
      });
      showRHSuccess('Document supprimé');
    },
    onError: (error: Error) => {
      handleRHError(error, 'DELETE_FAILED', { showToast: true });
    },
  });

  const getSignedUrl = async (filePath: string, documentId?: string): Promise<string | null> => {
    return createSignedDownloadUrl(filePath, documentId, 'preview');
  };

  const downloadDocument = async (doc: CollaboratorDocument) => {
    const url = await createSignedDownloadUrl(doc.file_path, doc.id, 'download');
    if (url) {
      window.open(url, '_blank');
    }
  };

  return {
    documents,
    isLoading,
    error,
    canManage,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    getSignedUrl,
  };
}

/**
 * Hook pour le coffre-fort salarié (vue employee)
 * Ne retourne QUE les documents du collaborateur connecté
 */
export function useMyDocuments() {
  const { user } = useAuth();
  
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['my-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // 1) Récupérer le collaborator_id de l'utilisateur connecté
      const { data: collaborator, error: collabError } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (collabError) throw collabError;
      if (!collaborator) return []; // Pas de profil collaborateur = pas de documents
      
      // 2) Ne charger que les documents de CE collaborateur avec visibilité employee
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('*')
        .eq('collaborator_id', collaborator.id)
        .eq('visibility', 'EMPLOYEE_VISIBLE')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CollaboratorDocument[];
    },
    enabled: !!user?.id,
  });

  const downloadDocument = async (doc: CollaboratorDocument) => {
    const url = await createSignedDownloadUrl(doc.file_path, doc.id, 'download');
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getSignedUrl = async (filePath: string, documentId?: string): Promise<string | null> => {
    return createSignedDownloadUrl(filePath, documentId, 'preview');
  };

  return {
    documents,
    isLoading,
    error,
    downloadDocument,
    getSignedUrl,
  };
}
