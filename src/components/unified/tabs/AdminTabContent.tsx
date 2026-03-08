/**
 * AdminTabContent - Contenu de l'onglet "Admin"
 * Protégé par MfaGuard pour les rôles sensibles (N4+)
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { MfaGuard } from '@/components/auth/MfaGuard';

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
    <MfaGuard>
      <Suspense fallback={<LoadingFallback />}>
        <AdminHubContent />
      </Suspense>
    </MfaGuard>
  );
}
