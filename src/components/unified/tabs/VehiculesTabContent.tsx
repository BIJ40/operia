/**
 * VehiculesTabContent - Contenu de l'onglet "Véhicules"
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const MaintenancePreventivePage = lazy(() => import('@/pages/MaintenancePreventivePage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function VehiculesTabContent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MaintenancePreventivePage />
    </Suspense>
  );
}
