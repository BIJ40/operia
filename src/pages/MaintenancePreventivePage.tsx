/**
 * Page Parc Véhicules
 * Route: /rh/parc
 */

import { ROUTES } from '@/config/routes';
import { VehiclesTab } from '@/components/maintenance/VehiclesTab';
import { useOpenMaintenanceAlertsCount } from '@/hooks/maintenance/useMaintenanceAlerts';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';

export default function MaintenancePreventivePage() {
  const { data: alertsCount = 0 } = useOpenMaintenanceAlertsCount();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Parc Véhicules"
        subtitle="Gestion des véhicules, CT, entretiens et assurances"
        backTo={ROUTES.rh.index}
        backLabel="RH & PARC"
        rightElement={
          alertsCount > 0 ? (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-sm">
              <Bell className="h-4 w-4" />
              {alertsCount} alerte{alertsCount > 1 ? 's' : ''} en cours
            </Badge>
          ) : undefined
        }
      />

      <VehiclesTab />
    </div>
  );
}
