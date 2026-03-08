/**
 * Hook et utilitaires pour le mode lecture seule (read-only).
 * 
 * Un utilisateur read-only peut VOIR toute l'application
 * mais ne peut effectuer AUCUNE action de mutation (créer, modifier, supprimer).
 */

import { useProfile } from '@/contexts/ProfileContext';
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook principal pour le mode lecture seule
 */
export function useReadOnly() {
  const { isReadOnly } = useAuth();

  /**
   * Bloque une action si l'utilisateur est en mode lecture seule.
   * Retourne true si l'action est bloquée.
   * 
   * @example
   * const { guardAction } = useReadOnly();
   * const handleDelete = () => {
   *   if (guardAction()) return;
   *   // ... proceed with delete
   * };
   */
  const guardAction = useCallback((customMessage?: string): boolean => {
    if (isReadOnly) {
      toast.info(customMessage || 'Accès en lecture seule — cette action est désactivée.', {
        duration: 3000,
        id: 'read-only-guard', // Prevent toast spam
      });
      return true; // blocked
    }
    return false; // allowed
  }, [isReadOnly]);

  return {
    isReadOnly,
    guardAction,
  };
}
