/**
 * Composant de redirection automatique pour les techniciens (N1)
 * Redirige vers /t (interface mobile-first) si l'utilisateur est franchisee_user (N1)
 * et qu'il accède à la route / (dashboard principal)
 * 
 * Le paramètre ?desktop=1 permet de forcer l'affichage du dashboard desktop
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface N1RedirectProps {
  children: React.ReactNode;
}

export function N1Redirect({ children }: N1RedirectProps) {
  const { globalRole, isAuthLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Si ?desktop=1, on force l'affichage desktop
  const forceDesktop = searchParams.get('desktop') === '1';
  
  // En cours de chargement auth, on affiche un loader
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Si N1 (franchisee_user) et pas de force desktop, rediriger vers l'interface mobile /t
  if (globalRole === 'franchisee_user' && !forceDesktop) {
    return <Navigate to="/t" replace />;
  }
  
  // N2+ ou force desktop : afficher le dashboard normal
  return <>{children}</>;
}
