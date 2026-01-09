/**
 * Page Véhicule Technicien Mobile
 */
import { Car, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMyCollaborator } from "@/hooks/rh-employee";
import { useMyVehicle } from "@/hooks/rh-employee/useMyVehicle";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";

export default function TechVehiculePage() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();
  const { data: vehicle, isLoading: loadingVehicle } = useMyVehicle();

  if (loadingCollaborator || loadingVehicle) {
    return <div className="p-4 space-y-4"><Skeleton className="h-48" /></div>;
  }

  if (!collaborator) {
    return <div className="p-4 space-y-4"><Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><CollaboratorNotConfigured /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold flex-1">Mon véhicule</h1>
        {vehicle && <Badge>{vehicle.status === 'active' ? 'Actif' : vehicle.status}</Badge>}
      </div>
      {!vehicle ? (
        <Card><CardContent className="py-12 text-center"><Car className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p>Aucun véhicule assigné</p></CardContent></Card>
      ) : (
        <Card><CardContent className="p-4 space-y-2">
          <p><span className="text-muted-foreground">Immat:</span> <strong>{vehicle.registration}</strong></p>
          <p><span className="text-muted-foreground">Marque:</span> {vehicle.brand} {vehicle.model}</p>
          {vehicle.mileage_km && <p><span className="text-muted-foreground">Km:</span> {vehicle.mileage_km.toLocaleString('fr-FR')}</p>}
        </CardContent></Card>
      )}
    </div>
  );
}
