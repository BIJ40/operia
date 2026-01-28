/**
 * PlanningsTabContent - Contenu de l'onglet "Plannings"
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PlanningsTabContent() {
  return (
    <div className="container mx-auto py-4 px-4">
      <Suspense fallback={<LoadingFallback />}>
        <PlanningHebdo />
      </Suspense>
    </div>
  );
}
