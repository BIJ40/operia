/**
 * Hook pour gérer les sous-dossiers persistants en base de données (P2-01)
 * Remplace useSubfolders qui utilisait localStorage
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DocumentType } from '@/types/collaboratorDocument';
import { toast } from 'sonner';

interface DocumentFolder {
  id: string;
  collaborator_id: string;
  parent_folder_id: string | null;
  name: string;
  doc_type: string;
  created_by: string | null;
  created_at: string;
}

export function useDocumentFolders(collaboratorId: string) {
  const queryClient = useQueryClient();

  // Fetch all folders for collaborator
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['document-folders', collaboratorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborator_document_folders')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .order('name');

      if (error) throw error;
      return data as DocumentFolder[];
    },
    enabled: !!collaboratorId,
  });

  // Get subfolders for a specific category
  const getSubfolders = useCallback((category: DocumentType): string[] => {
    return folders
      .filter((f) => f.doc_type === category && !f.parent_folder_id)
      .map((f) => f.name);
  }, [folders]);

  // Add subfolder mutation
  const addFolderMutation = useMutation({
    mutationFn: async ({ category, folderName }: { category: DocumentType; folderName: string }) => {
      const { data, error } = await supabase
        .from('collaborator_document_folders')
        .insert({
          collaborator_id: collaboratorId,
          name: folderName,
          doc_type: category,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders', collaboratorId] });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Ce dossier existe déjà');
      } else {
        toast.error('Erreur lors de la création du dossier');
      }
    },
  });

  // Remove subfolder mutation
  const removeFolderMutation = useMutation({
    mutationFn: async ({ category, folderName }: { category: DocumentType; folderName: string }) => {
      const { error } = await supabase
        .from('collaborator_document_folders')
        .delete()
        .eq('collaborator_id', collaboratorId)
        .eq('doc_type', category)
        .eq('name', folderName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders', collaboratorId] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du dossier');
    },
  });

  // Add subfolder
  const addSubfolder = useCallback((category: DocumentType, folderName: string) => {
    addFolderMutation.mutate({ category, folderName });
  }, [addFolderMutation]);

  // Remove subfolder
  const removeSubfolder = useCallback((category: DocumentType, folderName: string) => {
    removeFolderMutation.mutate({ category, folderName });
  }, [removeFolderMutation]);

  // Sync with documents (auto-create folders from existing document subfolders)
  const syncWithDocuments = useCallback((category: DocumentType, documentSubfolders: string[]) => {
    const existingFolders = getSubfolders(category);
    const newFolders = documentSubfolders.filter((f) => !existingFolders.includes(f));
    
    // Auto-create missing folders
    newFolders.forEach((folderName) => {
      addFolderMutation.mutate({ category, folderName });
    });
  }, [getSubfolders, addFolderMutation]);

  return {
    folders,
    isLoading,
    getSubfolders,
    addSubfolder,
    removeSubfolder,
    syncWithDocuments,
  };
}
