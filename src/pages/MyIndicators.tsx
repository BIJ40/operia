import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { SecondaryFiltersProvider } from '@/apogee-connect/contexts/SecondaryFiltersContext';
import Dashboard from '@/apogee-connect/pages/Dashboard';
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

  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <Dashboard />
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
