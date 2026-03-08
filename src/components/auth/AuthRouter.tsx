/**
 * AuthRouter - Routeur d'authentification global
 * 
 * Intercepte la navigation après authentification pour rediriger automatiquement
 * les utilisateurs "apporteur" vers leur espace dédié (/apporteur/dashboard)
 * 
 * Les utilisateurs internes (N0-N6) accèdent normalement à l'interface principale
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useApporteurCheck } from '@/hooks/useApporteurCheck';
import { Loader2 } from 'lucide-react';

interface AuthRouterProps {
  children: ReactNode;
}

function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

export function AuthRouter({ children }: AuthRouterProps) {
  const { user, isAuthLoading } = useAuthCore();
  const { isApporteur, isLoading: isApporteurLoading } = useApporteurCheck();
  const location = useLocation();

  // Routes /apporteur/* sont gérées par leur propre système d'auth (ApporteurAuthContext)
  // On les laisse passer directement
  if (location.pathname.startsWith('/apporteur')) {
    return <>{children}</>;
  }

  // Routes publiques qu'on laisse passer sans vérification
  const publicPaths = ['/401', '/403', '/500', '/qr/', '/login', '/signup', '/reset-password'];
  if (publicPaths.some(path => location.pathname.startsWith(path))) {
    return <>{children}</>;
  }

  // Afficher un loader pendant le chargement de l'auth ou de la vérification apporteur
  if (isAuthLoading || (user && isApporteurLoading)) {
    return <FullPageLoader />;
  }

  // Utilisateur apporteur connecté sur une route interne → redirection vers l'espace apporteur
  if (user && isApporteur) {
    console.log('[AuthRouter] Apporteur user detected, redirecting to /apporteur/dashboard');
    return <Navigate to="/apporteur/dashboard" replace />;
  }

  // Utilisateur interne ou non connecté → flux normal
  return <>{children}</>;
}

export default AuthRouter;
