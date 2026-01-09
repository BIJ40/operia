/**
 * Page Véhicule Technicien Mobile
 * Avec signalement d'anomalie et demandes véhicule
 */
import { useState } from "react";
import { Car, ArrowLeft, AlertTriangle, Wrench, Fuel, FileText, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMyCollaborator, useCreateRequest } from "@/hooks/rh-employee";
import { useMyVehicle } from "@/hooks/rh-employee/useMyVehicle";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";

type RequestCategory = "panne" | "accident" | "entretien" | "carburant" | "autre";

const ANOMALY_CATEGORIES: { value: RequestCategory; label: string; icon: React.ReactNode }[] = [
  { value: "panne", label: "Panne mécanique", icon: <Wrench className="w-4 h-4" /> },
  { value: "accident", label: "Accident / Sinistre", icon: <AlertTriangle className="w-4 h-4" /> },
  { value: "entretien", label: "Entretien nécessaire", icon: <Car className="w-4 h-4" /> },
  { value: "carburant", label: "Carte carburant", icon: <Fuel className="w-4 h-4" /> },
  { value: "autre", label: "Autre demande", icon: <FileText className="w-4 h-4" /> },
];

export default function TechVehiculePage() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();
  const { data: vehicle, isLoading: loadingVehicle } = useMyVehicle();
  const createRequest = useCreateRequest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAnomaly, setIsAnomaly] = useState(true);
  const [category, setCategory] = useState<RequestCategory>("panne");
  const [description, setDescription] = useState("");

  if (loadingCollaborator || loadingVehicle) {
    return <div className="p-4 space-y-4"><Skeleton className="h-48" /></div>;
  }

  if (!collaborator) {
    return (
      <div className="p-4 space-y-4">
        <Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <CollaboratorNotConfigured />
      </div>
    );
  }

  const handleOpenDialog = (anomaly: boolean) => {
    setIsAnomaly(anomaly);
    setCategory(anomaly ? "panne" : "autre");
    setDescription("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;

    await createRequest.mutateAsync({
      request_type: "OTHER",
      payload: {
        is_vehicle_request: true,
        is_anomaly: isAnomaly,
        category,
        description,
        vehicle_id: vehicle?.id ?? null,
        vehicle_registration: vehicle?.registration ?? null,
        vehicle_label: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration})` : "Non assigné",
      },
    });

    setDialogOpen(false);
    setDescription("");
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-lg font-bold flex-1">Mon véhicule</h1>
        {vehicle && (
          <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'}>
            {vehicle.status === 'active' ? 'Actif' : vehicle.status}
          </Badge>
        )}
      </div>

      {/* Vehicle Info Card */}
      {!vehicle ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Aucun véhicule assigné</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{vehicle.registration}</p>
                <p className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
              </div>
            </div>
            {vehicle.mileage_km && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Kilométrage</span>
                <span className="font-medium">{vehicle.mileage_km.toLocaleString('fr-FR')} km</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="destructive" 
            className="w-full justify-start gap-3"
            onClick={() => handleOpenDialog(true)}
          >
            <AlertTriangle className="w-5 h-5" />
            Signaler une anomalie
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3"
            onClick={() => handleOpenDialog(false)}
          >
            <FileText className="w-5 h-5" />
            Faire une demande
          </Button>
        </CardContent>
      </Card>

      {/* Dialog for reporting */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAnomaly ? (
                <><AlertTriangle className="w-5 h-5 text-destructive" /> Signaler une anomalie</>
              ) : (
                <><FileText className="w-5 h-5 text-primary" /> Faire une demande</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category selection */}
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <RadioGroup value={category} onValueChange={(v) => setCategory(v as RequestCategory)}>
                {ANOMALY_CATEGORIES.map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={cat.value} id={cat.value} />
                    <Label htmlFor={cat.value} className="flex items-center gap-2 cursor-pointer flex-1">
                      {cat.icon}
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder={isAnomaly 
                  ? "Décrivez le problème rencontré..."
                  : "Décrivez votre demande..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Vehicle info summary */}
            {vehicle && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                Véhicule concerné : {vehicle.brand} {vehicle.model} ({vehicle.registration})
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!description.trim() || createRequest.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {createRequest.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
