/**
 * Composant de redirection automatique pour les techniciens (N1)
 * Redirige vers /t (interface mobile-first) si l'utilisateur est franchisee_user (N1)
 * et qu'il accède à la route / (dashboard principal)
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface N1RedirectProps {
  children: React.ReactNode;
}

export function N1Redirect({ children }: N1RedirectProps) {
  const { globalRole, isAuthLoading } = useAuth();
  
  // En cours de chargement auth, on affiche un loader
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Si N1 (franchisee_user), rediriger vers l'interface mobile /t
  if (globalRole === 'franchisee_user') {
    return <Navigate to="/t" replace />;
  }
  
  // N2+ : afficher le dashboard normal
  return <>{children}</>;
}
