/**
 * VehiculesTabContent - Contenu de l'onglet "Véhicules" (Parc)
 * Liste simple des véhicules sans système d'onglets
 */

import { VehiclesOverview } from '@/components/maintenance/VehiclesOverview';
import { useFleetVehicles } from '@/hooks/maintenance/useFleetVehicles';

export default function VehiculesTabContent() {
  const { data: vehicles = [], isLoading } = useFleetVehicles();

  return (
    <div className="h-full p-4">
      <VehiclesOverview vehicles={vehicles} isLoading={isLoading} />
    </div>
  );
}
