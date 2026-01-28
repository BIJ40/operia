/**
 * AdminTabContent - Contenu de l'onglet "Admin"
 * Affiche le dashboard d'administration plateforme
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const AdminIndex = lazy(() => import('@/pages/AdminIndex'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AdminTabContent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminIndex />
    </Suspense>
  );
}
