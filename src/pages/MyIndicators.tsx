import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function MyIndicators() {
  const { isAuthenticated, hasAccessToScope } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccessToScope('mes_indicateurs')) {
    return <Navigate to="/" replace />;
  }

  // Redirect to the new layout route
  return <Navigate to="/mes-indicateurs" replace />;
}
