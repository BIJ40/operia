/**
 * TicketingTabContent - Contenu de l'onglet "Ticketing"
 * Accès au module de gestion de projet (Kanban)
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ApogeeTicketsKanban = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsKanban'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function TicketingTabContent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ApogeeTicketsKanban />
    </Suspense>
  );
}
