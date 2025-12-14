/**
 * Page Mon Planning - Planning personnel du technicien
 * Réutilise TechWeeklyPlanningList avec filtre sur l'apogee_user_id du salarié
 * Mode N1: le tech peut signer son planning après envoi par N2
 */
import React from "react";
import { Calendar, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TechWeeklyPlanningList } from "@/apogee-connect/components/TechWeeklyPlanningList";
import { AgencyProvider, useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { useMyCollaborator } from "@/hooks/rh-employee";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";
import { PlanningNotificationBadge } from "@/components/planning/PlanningNotificationBadge";

function MonPlanningContent() {
  const { isAgencyReady } = useAgency();
  const { data: collaborator, isLoading: loadingCollaborator } = useMyCollaborator();

  if (loadingCollaborator || !isAgencyReady) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Planning"
          subtitle="Votre planning hebdomadaire"
          backTo="/rh"
        />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
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
          title="Mon Planning"
          subtitle="Votre planning hebdomadaire"
          backTo="/rh"
        />
        <CollaboratorNotConfigured />
      </div>
    );
  }

  // Vérifier que le collaborateur a un apogee_user_id
  if (!collaborator.apogee_user_id) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mon Planning"
          subtitle="Votre planning hebdomadaire"
          backTo="/rh"
        />
        <Card className="border-amber-500/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="font-medium text-lg mb-2">Liaison Apogée non configurée</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Votre compte n'est pas encore lié à votre profil technicien Apogée.
              Contactez votre responsable RH pour configurer cette liaison.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Mon Planning"
          subtitle={`Planning de ${collaborator.first_name} ${collaborator.last_name}`}
          backTo="/rh"
        />
        <PlanningNotificationBadge />
      </div>

      {/* Planning filtré sur le technicien connecté, mode N1 */}
      <TechWeeklyPlanningList 
        techFilterId={collaborator.apogee_user_id} 
        isN1View={true}
      />
    </div>
  );
}

export default function MonPlanningPage() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <MonPlanningContent />
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
