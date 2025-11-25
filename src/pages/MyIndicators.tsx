import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyKpis } from '@/hooks/use-metrics';
import { Navigate } from 'react-router-dom';

export default function MyIndicators() {
  const { isAuthenticated, hasAccessToScope } = useAuth();
  const [period] = useState<'day' | 'yesterday' | 'week' | 'month' | 'year' | 'rolling12'>('month');
  const { data } = useAgencyKpis({ period });

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccessToScope('mes_indicateurs')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Mes Indicateurs
        </h1>
      </div>
    </div>
  );
}
