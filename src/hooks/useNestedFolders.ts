/**
 * Hook pour gérer les dossiers imbriqués (nested folders) en base de données
 * Supporte la création de dossiers dans des dossiers
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DocumentType } from '@/types/collaboratorDocument';
import { toast } from 'sonner';

export interface DocumentFolder {
  id: string;
  collaborator_id: string;
  parent_folder_id: string | null;
  name: string;
  doc_type: string;
  created_by: string | null;
  created_at: string;
}

export interface FolderPath {
  id: string | null;
  name: string;
}

export function useNestedFolders(collaboratorId: string) {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Fetch all folders for collaborator
  const { data: allFolders = [], isLoading } = useQuery({
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

  // Get subfolders for current location
  const getSubfolders = useCallback((category: DocumentType, parentId: string | null): DocumentFolder[] => {
    return allFolders.filter(
      (f) => f.doc_type === category && f.parent_folder_id === parentId
    );
  }, [allFolders]);

  // Build folder path from root to current folder
  const getFolderPath = useCallback((folderId: string | null): FolderPath[] => {
    if (!folderId) return [];
    
    const path: FolderPath[] = [];
    let current = allFolders.find(f => f.id === folderId);
    
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = current.parent_folder_id 
        ? allFolders.find(f => f.id === current!.parent_folder_id)
        : undefined;
    }
    
    return path;
  }, [allFolders]);

  // Get folder by ID
  const getFolderById = useCallback((folderId: string | null): DocumentFolder | undefined => {
    if (!folderId) return undefined;
    return allFolders.find(f => f.id === folderId);
  }, [allFolders]);

  // Add folder mutation
  const addFolderMutation = useMutation({
    mutationFn: async ({ 
      category, 
      folderName, 
      parentFolderId 
    }: { 
      category: DocumentType; 
      folderName: string;
      parentFolderId: string | null;
    }) => {
      const { data, error } = await supabase
        .from('collaborator_document_folders')
        .insert({
          collaborator_id: collaboratorId,
          name: folderName,
          doc_type: category,
          parent_folder_id: parentFolderId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-folders', collaboratorId] });
      toast.success(`Dossier "${data.name}" créé`);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Ce dossier existe déjà');
      } else {
        toast.error('Erreur lors de la création du dossier');
      }
    },
  });

  // Remove folder mutation
  const removeFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      // Check if folder has children
      const hasChildren = allFolders.some(f => f.parent_folder_id === folderId);
      if (hasChildren) {
        throw new Error('Impossible de supprimer un dossier contenant des sous-dossiers');
      }

      const { error } = await supabase
        .from('collaborator_document_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders', collaboratorId] });
      toast.success('Dossier supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression du dossier');
    },
  });

  // Create folder - explicitly requires parentFolderId to avoid confusion
  const createFolder = useCallback((
    category: DocumentType, 
    folderName: string, 
    parentFolderId: string | null
  ) => {
    console.log('[useNestedFolders] Creating folder:', { category, folderName, parentFolderId });
    addFolderMutation.mutate({ category, folderName, parentFolderId });
  }, [addFolderMutation]);

  // Delete folder
  const deleteFolder = useCallback((folderId: string) => {
    removeFolderMutation.mutate(folderId);
  }, [removeFolderMutation]);

  // Navigate to folder
  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);

  return {
    allFolders,
    currentFolderId,
    isLoading,
    getSubfolders,
    getFolderPath,
    getFolderById,
    createFolder,
    deleteFolder,
    navigateToFolder,
    isCreating: addFolderMutation.isPending,
  };
}
