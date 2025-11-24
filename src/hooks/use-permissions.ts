import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface Block {
  id: string;
  parentId?: string | null;
  [key: string]: any;
}

export function useFilteredBlocks<T extends Block>(blocks: T[]): T[] {
  const { hasAccessToBlock, isAdmin, roleAgence } = useAuth();

  return useMemo(() => {
    // Les admins et les utilisateurs sans rôle spécifique voient tout
    if (isAdmin || !roleAgence) {
      return blocks;
    }

    // Filtrer les blocks selon les permissions
    return blocks.filter(block => {
      // Si c'est une catégorie, vérifier si l'utilisateur y a accès
      if (block.type === 'category') {
        return hasAccessToBlock(block.id);
      }
      
      // Si c'est une section, vérifier si l'utilisateur a accès à sa catégorie parente
      if (block.type === 'section' && block.parentId) {
        const parentCategory = blocks.find(b => b.id === block.parentId);
        if (parentCategory) {
          return hasAccessToBlock(parentCategory.id) && hasAccessToBlock(block.id);
        }
      }
      
      // Par défaut, autoriser l'accès
      return hasAccessToBlock(block.id);
    });
  }, [blocks, hasAccessToBlock, isAdmin, roleAgence]);
}
