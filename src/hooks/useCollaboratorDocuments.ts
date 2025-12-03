/**
 * Hooks pour la gestion des documents RH - Phase 2.1
 */

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

/**
 * Génère une URL signée pour télécharger un fichier (partagé entre hooks)
 */
async function createSignedDownloadUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error) {
    toast.error('Erreur lors de la génération du lien');
    return null;
  }
  return data.signedUrl;
}

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
    return createSignedDownloadUrl(filePath);
  };

  const downloadDocument = async (doc: CollaboratorDocument) => {
    const url = await createSignedDownloadUrl(doc.file_path);
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
    const url = await createSignedDownloadUrl(doc.file_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return {
    documents,
    isLoading,
    error,
    downloadDocument,
  };
}
