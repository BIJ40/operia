/**
 * Page Mon Véhicule - Véhicule assigné au technicien (N1)
 * Lecture seule - affiche les infos véhicule, CT, entretien
 * SANS détails leasing/assurance sensibles
 * AVEC boutons signalement/demande
 */
import React, { useState } from "react";
import { Car, AlertTriangle, Calendar, Fuel, Gauge, FileText, CheckCircle, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyCollaborator } from "@/hooks/rh-employee";
import { useMyVehicle } from "@/hooks/rh-employee/useMyVehicle";
import { useCreateRequest } from "@/hooks/rh-employee/useMyRequests";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

function DateAlertBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return <span className="text-muted-foreground text-sm">Non renseigné</span>;
  
  const parsedDate = parseISO(date);
  const today = new Date();
  const daysUntil = differenceInDays(parsedDate, today);
  const isOverdue = isBefore(parsedDate, today);
  
  let variant: "default" | "destructive" | "secondary" | "outline" = "default";
  let statusText = "";
  
  if (isOverdue) {
    variant = "destructive";
    statusText = "Dépassé";
  } else if (daysUntil <= 30) {
    variant = "destructive";
    statusText = `Dans ${daysUntil} jours`;
  } else if (daysUntil <= 90) {
    variant = "secondary";
    statusText = `Dans ${daysUntil} jours`;
  } else {
    variant = "outline";
    statusText = "OK";
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{format(parsedDate, "dd MMM yyyy", { locale: fr })}</span>
      <Badge variant={variant}>{statusText}</Badge>
    </div>
  );
}

function VehicleInfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-sm">{label}</span>
      </div>
      <div className="font-medium">{value || <span className="text-muted-foreground text-sm">-</span>}</div>
    </div>
  );
}

type RequestModalType = 'anomaly' | 'request' | null;

function MonVehiculeContent() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();
  const { data: vehicle, isLoading: loadingVehicle } = useMyVehicle();
  const { mutate: createRequest, isPending: isCreatingRequest } = useCreateRequest();
  
  const [modalType, setModalType] = useState<RequestModalType>(null);
  const [requestCategory, setRequestCategory] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState('');

  const isLoading = loadingCollaborator || loadingVehicle;

  const handleSubmitRequest = () => {
    if (!requestMessage.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }

    const isAnomaly = modalType === 'anomaly';
    const title = isAnomaly 
      ? `Signalement véhicule: ${requestCategory || 'Anomalie'}`
      : `Demande véhicule: ${requestCategory || 'Autre'}`;
    
    const description = `Véhicule: ${vehicle?.registration || 'N/A'} - ${vehicle?.brand || ''} ${vehicle?.model || ''}\n\n${requestMessage}`;

    createRequest({
      request_type: 'OTHER',
      payload: {
        title,
        description,
        vehicle_id: vehicle?.id,
        vehicle_registration: vehicle?.registration,
        category: requestCategory,
        is_anomaly: isAnomaly,
        is_vehicle_request: true,
      }
    }, {
      onSuccess: () => {
        toast.success(isAnomaly ? "Signalement envoyé" : "Demande envoyée");
        setModalType(null);
        setRequestCategory('');
        setRequestMessage('');
      },
      onError: () => {
        toast.error("Erreur lors de l'envoi");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Véhicule"
          subtitle="Véhicule de service assigné"
          backTo="/rh"
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Cas: pas de collaborateur lié
  if (!collaborator) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Véhicule"
          subtitle="Véhicule de service assigné"
          backTo="/rh"
        />
        <CollaboratorNotConfigured />
      </div>
    );
  }

  // Cas: pas de véhicule assigné
  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Véhicule"
          subtitle="Véhicule de service assigné"
          backTo="/rh"
        />
        <Card className="border-muted">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Aucun véhicule assigné</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Vous n'avez pas de véhicule de service assigné actuellement.
              Contactez votre responsable si vous pensez qu'il s'agit d'une erreur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Mon Véhicule"
        subtitle={`${vehicle.name || vehicle.registration}`}
        backTo="/rh"
      />

      {/* Boutons d'action */}
      <div className="flex flex-wrap gap-3">
        <Button 
          variant="outline" 
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => setModalType('anomaly')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Signaler une anomalie
        </Button>
        <Button 
          variant="outline"
          onClick={() => setModalType('request')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Faire une demande
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations véhicule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5" />
              Informations véhicule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <VehicleInfoRow label="Immatriculation" value={vehicle.registration} />
            <VehicleInfoRow label="Marque" value={vehicle.brand} />
            <VehicleInfoRow label="Modèle" value={vehicle.model} />
            <VehicleInfoRow 
              label="Kilométrage" 
              value={vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString('fr-FR')} km` : null}
              icon={Gauge}
            />
            <VehicleInfoRow 
              label="Carburant" 
              value={vehicle.fuel_type}
              icon={Fuel}
            />
            <VehicleInfoRow 
              label="Statut" 
              value={
                <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'}>
                  {vehicle.status === 'active' ? 'Actif' : vehicle.status}
                </Badge>
              }
            />
          </CardContent>
        </Card>

        {/* Dates importantes - Sans leasing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Échéances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <VehicleInfoRow 
              label="Contrôle technique" 
              value={<DateAlertBadge date={vehicle.ct_due_at} label="CT" />}
              icon={FileText}
            />
            <VehicleInfoRow 
              label="Prochaine révision" 
              value={<DateAlertBadge date={vehicle.next_revision_at} label="Révision" />}
            />
          </CardContent>
        </Card>

        {/* Notes (si présentes) */}
        {vehicle.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Signalement / Demande */}
      <Dialog open={modalType !== null} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalType === 'anomaly' ? 'Signaler une anomalie' : 'Faire une demande'}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'anomaly' 
                ? 'Décrivez le problème rencontré avec votre véhicule'
                : 'Décrivez votre demande concernant le véhicule'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Catégorie</label>
              <Select value={requestCategory} onValueChange={setRequestCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {modalType === 'anomaly' ? (
                    <>
                      <SelectItem value="panne">Panne</SelectItem>
                      <SelectItem value="accident">Accident / Sinistre</SelectItem>
                      <SelectItem value="voyant">Voyant allumé</SelectItem>
                      <SelectItem value="bruit">Bruit anormal</SelectItem>
                      <SelectItem value="usure">Usure / Dégradation</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="entretien">Demande d'entretien</SelectItem>
                      <SelectItem value="nettoyage">Nettoyage / Lavage</SelectItem>
                      <SelectItem value="accessoire">Accessoire / Équipement</SelectItem>
                      <SelectItem value="carburant">Carte carburant</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder={modalType === 'anomaly' 
                  ? "Décrivez le problème en détail..."
                  : "Décrivez votre demande..."
                }
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmitRequest} 
              disabled={isCreatingRequest || !requestMessage.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              {isCreatingRequest ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MonVehiculePage() {
  return <MonVehiculeContent />;
}
