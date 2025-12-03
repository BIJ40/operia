/**
 * Hook pour gérer les sous-dossiers persistants (localStorage)
 * Les sous-dossiers restent même s'ils sont vides
 */

import { useState, useEffect, useCallback } from 'react';
import { DocumentType } from '@/types/collaboratorDocument';

interface SubfolderState {
  [category: string]: string[];
}

const STORAGE_KEY_PREFIX = 'hr-subfolders-';

export function useSubfolders(collaboratorId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${collaboratorId}`;
  
  const [subfolders, setSubfolders] = useState<SubfolderState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(subfolders));
    } catch {
      // Ignore storage errors
    }
  }, [subfolders, storageKey]);

  // Get subfolders for a category
  const getSubfolders = useCallback((category: DocumentType): string[] => {
    return subfolders[category] || [];
  }, [subfolders]);

  // Add a subfolder to a category
  const addSubfolder = useCallback((category: DocumentType, folderName: string) => {
    setSubfolders((prev) => {
      const categoryFolders = prev[category] || [];
      if (categoryFolders.includes(folderName)) {
        return prev; // Already exists
      }
      return {
        ...prev,
        [category]: [...categoryFolders, folderName].sort(),
      };
    });
  }, []);

  // Remove a subfolder from a category
  const removeSubfolder = useCallback((category: DocumentType, folderName: string) => {
    setSubfolders((prev) => {
      const categoryFolders = prev[category] || [];
      return {
        ...prev,
        [category]: categoryFolders.filter((f) => f !== folderName),
      };
    });
  }, []);

  // Sync with documents (add any subfolders from documents that aren't tracked)
  const syncWithDocuments = useCallback((category: DocumentType, documentSubfolders: string[]) => {
    setSubfolders((prev) => {
      const categoryFolders = prev[category] || [];
      const newFolders = documentSubfolders.filter((f) => !categoryFolders.includes(f));
      if (newFolders.length === 0) {
        return prev;
      }
      return {
        ...prev,
        [category]: [...categoryFolders, ...newFolders].sort(),
      };
    });
  }, []);

  return {
    getSubfolders,
    addSubfolder,
    removeSubfolder,
    syncWithDocuments,
  };
}
