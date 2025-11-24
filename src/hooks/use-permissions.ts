import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface Block {
  id: string;
  parentId?: string | null;
  [key: string]: any;
}

// Ne plus filtrer, mais retourner tous les blocks
export function useFilteredBlocks<T extends Block>(blocks: T[]): T[] {
  return blocks;
}

// Nouvelle fonction pour vérifier si un block est verrouillé
export function useIsBlockLocked() {
  const { hasAccessToBlock, isAdmin, roleAgence } = useAuth();

  return useMemo(() => {
    return (blockId: string, blocks: Block[] = []): boolean => {
      // Les admins ont accès à tout
      if (isAdmin) {
        return false;
      }

      // Les utilisateurs sans rôle spécifique ont accès à tout
      if (!roleAgence) {
        return false;
      }

      // Vérifier l'accès au block via la logique centrale
      return !hasAccessToBlock(blockId);
    };
  }, [hasAccessToBlock, isAdmin, roleAgence]);
}
