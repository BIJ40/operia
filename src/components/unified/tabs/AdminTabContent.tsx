/**
 * AdminTabContent - Contenu de l'onglet "Admin"
 * Nouveau workspace à 6 onglets (Accès, Réseau, IA, Contenu, Ops, Plateforme)
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const AdminHubContent = lazy(() => import('./AdminHubContent'));

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
      <AdminHubContent />
    </Suspense>
  );
}
