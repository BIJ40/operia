/**
 * ApporteurGuard - Protection des routes Apporteur
 * Utilise le nouveau système d'authentification autonome (ApporteurSessionContext)
 * 
 * DEV MODE: Bypass l'auth en preview/localhost pour tester l'UI
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { Loader2, ShieldX } from 'lucide-react';

interface ApporteurGuardProps {
  /** Requiert le rôle manager */
  requireManager?: boolean;
  /** Contenu à afficher si autorisé */
  children: ReactNode;
  /** Redirection si non autorisé */
  redirectTo?: string;
}

export function ApporteurGuard({ 
  requireManager = false,
  children, 
  redirectTo = '/apporteur'
}: ApporteurGuardProps) {
  const { isAuthenticated, isLoading, isManager } = useApporteurSession();

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  // Rediriger si non authentifié
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Vérifier le rôle manager si requis
  if (requireManager && !isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Accès refusé
        </h1>
        <p className="text-muted-foreground text-center max-w-md">
          Cette section est réservée aux gestionnaires de l'organisation apporteur.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default ApporteurGuard;
