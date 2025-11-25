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
    // Admins ou utilisateurs sans rôle agence : on laisse tout
    if (isAdmin || !roleAgence) {
      return blocks;
    }

    // On garde uniquement les blocks explicitement autorisés
    return blocks.filter(block => hasAccessToBlock(block.id));
  }, [blocks, hasAccessToBlock, isAdmin, roleAgence]);
}

// Vérifier si un block est verrouillé
export function useIsBlockLocked() {
  const { hasAccessToBlock, isAdmin, roleAgence } = useAuth();

  return useMemo(() => {
    return (blockId: string): boolean => {
      // Admins ou utilisateurs sans rôle agence : jamais verrouillé
      if (isAdmin || !roleAgence) {
        return false;
      }

      // Locked si pas d'accès
      return !hasAccessToBlock(blockId);
    };
  }, [hasAccessToBlock, isAdmin, roleAgence]);
}
