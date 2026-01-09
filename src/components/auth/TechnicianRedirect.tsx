/**
 * Composant de redirection automatique pour les techniciens (N1)
 * Redirige vers /t (interface mobile-first) si l'utilisateur est franchisee_user
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function TechnicianRedirect({ children }: { children: React.ReactNode }) {
  const { globalRole, isAuthLoading } = useAuth();
  const location = useLocation();
  
  // En cours de chargement auth, on attend
  if (isAuthLoading) {
    return null;
  }
  
  // Si N1 (franchisee_user) et pas déjà sur /t, rediriger vers /t
  if (globalRole === 'franchisee_user' && !location.pathname.startsWith('/t')) {
    return <Navigate to="/t" replace />;
  }
  
  // Sinon, afficher le contenu normal (dashboard N2+)
  return <>{children}</>;
}
