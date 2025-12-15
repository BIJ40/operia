/**
 * Page Mon Véhicule - Véhicule assigné au technicien (N1)
 * Lecture seule - affiche les infos véhicule, CT, entretien, carte carburant
 */
import React from "react";
import { Car, AlertTriangle, Calendar, Fuel, Gauge, FileText, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMyCollaborator } from "@/hooks/rh-employee";
import { useMyVehicle } from "@/hooks/rh-employee/useMyVehicle";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

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

function MonVehiculeContent() {
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();
  const { data: vehicle, isLoading: loadingVehicle } = useMyVehicle();

  const isLoading = loadingCollaborator || loadingVehicle;

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

        {/* Dates importantes */}
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
            <VehicleInfoRow 
              label="Fin d'assurance" 
              value={<DateAlertBadge date={vehicle.insurance_expiry_at} label="Assurance" />}
            />
            {vehicle.leasing_end_at && (
              <VehicleInfoRow 
                label="Fin de leasing" 
                value={<DateAlertBadge date={vehicle.leasing_end_at} label="Leasing" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Assurance & Leasing */}
        {(vehicle.insurance_company || vehicle.leasing_company) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Assurance & Leasing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicle.insurance_company && (
                  <>
                    <VehicleInfoRow label="Assureur" value={vehicle.insurance_company} />
                    <VehicleInfoRow label="N° contrat" value={vehicle.insurance_contract_number} />
                  </>
                )}
                {vehicle.leasing_company && (
                  <>
                    <VehicleInfoRow label="Société de leasing" value={vehicle.leasing_company} />
                    <VehicleInfoRow 
                      label="Mensualité" 
                      value={vehicle.leasing_monthly_amount ? `${vehicle.leasing_monthly_amount.toLocaleString('fr-FR')} €` : null} 
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
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
    </div>
  );
}

export default function MonVehiculePage() {
  return <MonVehiculeContent />;
}
