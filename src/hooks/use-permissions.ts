import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface Block {
  id: string;
  parentId?: string | null;
  [key: string]: any;
}

// Filtrer les blocks selon les permissions de l'utilisateur
export function useFilteredBlocks<T extends Block>(blocks: T[]): T[] {
  const { hasAccessToBlock, isAdmin, roleAgence } = useAuth();

  return useMemo(() => {
    // Les admins et les utilisateurs sans rôle spécifique voient tout
    if (isAdmin || !roleAgence) {
      return blocks;
    }

    // Filtrer les blocs selon les permissions
    return blocks.filter(block => hasAccessToBlock(block.id));
  }, [blocks, hasAccessToBlock, isAdmin, roleAgence]);
}

// Nouvelle fonction pour vérifier si un block est verrouillé
export function useIsBlockLocked() {
  const { hasAccessToBlock, isAdmin, roleAgence } = useAuth();

  return useMemo(() => {
    return (blockId: string, blocks: Block[] = []): boolean => {
      // Les admins et les utilisateurs sans rôle spécifique ont accès à tout
      if (isAdmin || !roleAgence) {
        return false;
      }

      // Vérifier l'accès au block
      return !hasAccessToBlock(blockId);
    };
  }, [hasAccessToBlock, isAdmin, roleAgence]);
}
