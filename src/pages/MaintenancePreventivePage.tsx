/**
 * Page Parc Véhicules avec système d'onglets browser-like
 * Route: /rh/parc
 */

import { ROUTES } from '@/config/routes';
import { useFleetVehicles } from '@/hooks/maintenance/useFleetVehicles';
import { useOpenMaintenanceAlertsCount } from '@/hooks/maintenance/useMaintenanceAlerts';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { VehiclesOverview } from '@/components/maintenance/VehiclesOverview';
import { 
  VehicleTabsProvider, 
  VehicleTabsBar, 
  VehicleTabsContent 
} from '@/components/maintenance/browser-tabs';

interface MaintenancePreventivePageProps {
  /** Si true, n'affiche pas le header (pour embedding dans interface unifiée) */
  embedded?: boolean;
}

export default function MaintenancePreventivePage({ embedded = false }: MaintenancePreventivePageProps) {
  const { data: alertsCount = 0 } = useOpenMaintenanceAlertsCount();
  const { data: vehicles = [], isLoading } = useFleetVehicles();

  const content = (
    <VehicleTabsProvider vehicles={vehicles}>
      <div className={embedded 
        ? "flex flex-col h-full" 
        : "container mx-auto max-w-app px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-6rem)]"
      }>
        {!embedded && (
          <PageHeader
            title="Parc Véhicules"
            subtitle="Gestion des véhicules, CT, entretiens et assurances"
            backTo={ROUTES.rh.index}
            backLabel="RH & Maintenance"
            rightElement={
              alertsCount > 0 ? (
                <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-sm">
                  <Bell className="h-4 w-4" />
                  {alertsCount} alerte{alertsCount > 1 ? 's' : ''} en cours
                </Badge>
              ) : undefined
            }
          />
        )}

        <div className={embedded ? "flex-1 flex flex-col min-h-0" : "flex-1 flex flex-col min-h-0 mt-4"}>
          <VehicleTabsBar vehicles={vehicles} />
          <VehicleTabsContent 
            overviewContent={<VehiclesOverview vehicles={vehicles} isLoading={isLoading} />} 
          />
        </div>
      </div>
    </VehicleTabsProvider>
  );

  return content;
}
