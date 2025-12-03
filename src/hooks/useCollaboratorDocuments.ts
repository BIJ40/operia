/**
 * Hooks pour la gestion des documents RH - Phase 2.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CollaboratorDocument, CollaboratorDocumentFormData } from '@/types/collaboratorDocument';
import { toast } from 'sonner';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { useAuth } from '@/contexts/AuthContext';

const BUCKET_NAME = 'rh-documents';

export function useCollaboratorDocuments(collaboratorId: string | undefined) {
  const queryClient = useQueryClient();
  const canManage = useHasMinLevel(2);
  const { agencyId, user } = useAuth();

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
          uploaded_by: user.id,
        })
        .select('*')
        .single();

      if (error) {
        // Rollback: delete uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        throw error;
      }

      return data as CollaboratorDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', variables.collaborator_id] });
      toast.success('Document ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur upload: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', collaboratorId] });
      toast.success('Document mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', collaboratorId] });
      toast.success('Document supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur suppression: ${error.message}`);
    },
  });

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour

    if (error) {
      toast.error('Erreur lors de la génération du lien');
      return null;
    }
    return data.signedUrl;
  };

  const downloadDocument = async (doc: CollaboratorDocument) => {
    const url = await getSignedUrl(doc.file_path);
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
 */
export function useMyDocuments() {
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('*')
        .eq('visibility', 'EMPLOYEE_VISIBLE')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CollaboratorDocument[];
    },
  });

  const downloadDocument = async (doc: CollaboratorDocument) => {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.file_path, 3600);

    if (error) {
      toast.error('Erreur lors du téléchargement');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  return {
    documents,
    isLoading,
    error,
    downloadDocument,
  };
}
