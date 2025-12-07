/**
 * Widget Alertes Maintenance - Affiche les échéances à venir
 */

import { AlertTriangle, Calendar } from 'lucide-react';

export function MaintenanceAlertsWidget() {
  // Pour l'instant, affichage statique - sera connecté au module Maintenance
  return (
    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
      <Calendar className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm text-center">Module maintenance</p>
      <p className="text-xs text-center mt-1">Bientôt disponible</p>
    </div>
  );
}
