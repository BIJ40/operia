/**
 * ApporteurGuard - Protection des routes Apporteur
 * Utilise le nouveau système d'authentification autonome (ApporteurSessionContext)
 * 
 * DEV MODE: Bypass l'auth en preview/localhost pour tester l'UI
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { Loader2, ShieldX, Bug } from 'lucide-react';

interface ApporteurGuardProps {
  /** Requiert le rôle manager */
  requireManager?: boolean;
  /** Contenu à afficher si autorisé */
  children: ReactNode;
  /** Redirection si non autorisé */
  redirectTo?: string;
}

// Check if we're in dev/preview mode
const isDevMode = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' ||
         hostname.includes('preview') || 
         hostname.includes('lovable');
};

export function ApporteurGuard({ 
  requireManager = false,
  children, 
  redirectTo = '/apporteur'
}: ApporteurGuardProps) {
  const { isAuthenticated, isLoading, isManager } = useApporteurSession();

  // DEV MODE BYPASS - Permet d'accéder à l'espace apporteur sans auth en dev
  if (isDevMode() && !isAuthenticated && !isLoading) {
    console.log('🔧 DEV MODE: Bypass ApporteurGuard - accès direct autorisé');
    return (
      <div className="relative">
        {/* Banner DEV */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-1 text-center text-sm font-medium flex items-center justify-center gap-2">
          <Bug className="w-4 h-4" />
          MODE DEV - Accès apporteur sans authentification
        </div>
        <div className="pt-8">
          {children}
        </div>
      </div>
    );
  }

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
