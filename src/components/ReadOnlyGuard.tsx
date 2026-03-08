/**
 * ReadOnlyGuard - Composant pour bloquer les actions en mode lecture seule.
 * 
 * Enveloppe un élément interactif (bouton, formulaire, etc.) et le désactive
 * visuellement + fonctionnellement si l'utilisateur est read-only.
 * 
 * @example
 * <ReadOnlyGuard>
 *   <Button onClick={handleDelete}>Supprimer</Button>
 * </ReadOnlyGuard>
 */

import { ReactNode } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadOnlyGuardProps {
  children: ReactNode;
  /** Si true, masque complètement l'élément au lieu de le désactiver */
  hide?: boolean;
  /** Message affiché dans le tooltip */
  message?: string;
}

export function ReadOnlyGuard({ 
  children, 
  hide = false, 
  message = 'Accès en lecture seule' 
}: ReadOnlyGuardProps) {
  const { isReadOnly } = useAuth();

  if (!isReadOnly) {
    return <>{children}</>;
  }

  if (hide) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex opacity-40 pointer-events-none select-none" aria-disabled="true">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{message}</p>
      </TooltipContent>
    </Tooltip>
  );
}
