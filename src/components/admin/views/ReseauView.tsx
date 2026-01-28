/**
 * ReseauView - Vue Réseau (Agences)
 */

import { lazy, Suspense } from 'react';
import { AdminViewHeader } from '../AdminViewHeader';
import { Building2, Loader2 } from 'lucide-react';

const AdminAgencies = lazy(() => import('@/pages/AdminAgencies'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function ReseauView() {
  return (
    <div className="space-y-4">
      <AdminViewHeader
        title="Réseau d'Agences"
        subtitle="Configuration et gestion des agences"
        breadcrumb={['Admin', 'Réseau', 'Agences']}
        icon={<Building2 className="h-5 w-5 text-primary" />}
      />

      <Suspense fallback={<LoadingFallback />}>
        <AdminAgencies />
      </Suspense>
    </div>
  );
}
