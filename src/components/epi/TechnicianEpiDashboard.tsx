import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HardHat, AlertTriangle, FileCheck, Plus, ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthCore } from "@/contexts/AuthCoreContext";
import { useMyEpiAssignments } from "@/hooks/epi/useEpiAssignments";
import { useMyEpiRequests, EPI_REQUEST_STATUSES } from "@/hooks/epi/useEpiRequests";
import { useMyEpiIncidents, EPI_INCIDENT_STATUSES } from "@/hooks/epi/useEpiIncidents";
import { useMyCurrentAck } from "@/hooks/epi/useEpiAcknowledgements";
import { EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { RequestEpiDialog } from "./RequestEpiDialog";
import { ReportIncidentDialog } from "./ReportIncidentDialog";
import { SignAckDialog } from "./SignAckDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

// Hook inline pour récupérer le collaborateur (remplace useMyCollaborator supprimé)
function useCollaboratorForEpi() {
  const { user } = useAuthCore();
  return useQuery({
    queryKey: ["epi-collaborator", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("collaborators")
        .select("id, agency_id, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function TechnicianEpiDashboard() {
  const { data: collaborator, isLoading: collabLoading } = useCollaboratorForEpi();
  const { data: assignments, isLoading: assignLoading } = useMyEpiAssignments(collaborator?.id);
  const { data: requests, isLoading: reqLoading } = useMyEpiRequests(collaborator?.id);
  const { data: incidents, isLoading: incLoading } = useMyEpiIncidents(collaborator?.id);
  const { data: currentAck, isLoading: ackLoading } = useMyCurrentAck(collaborator?.id);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const isLoading = collabLoading || assignLoading || reqLoading || incLoading || ackLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!collaborator) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Profil collaborateur non configuré.
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === "pending").length || 0;
  const openIncidents = incidents?.filter(i => i.status === "open").length || 0;
  const needsSignature = currentAck?.status === "pending";
  const collaboratorName = `${collaborator.first_name} ${collaborator.last_name}`;

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-auto py-3 flex-col gap-1"
          onClick={() => setRequestDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs">Demander EPI</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-3 flex-col gap-1"
          onClick={() => setIncidentDialogOpen(true)}
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="text-xs">Signaler</span>
        </Button>
      </div>

      {/* Monthly Signature Alert */}
      {needsSignature && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Attestation du mois</p>
                <p className="text-sm text-orange-700">À signer avant fin du mois</p>
              </div>
            </div>
            <Button size="sm" variant="default" onClick={() => setSignDialogOpen(true)}>
              Signer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="epi" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="epi" className="text-xs">Mes EPI</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs relative">
            Demandes
            {pendingRequests > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px]">
                {pendingRequests}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs relative">
            Signalements
            {openIncidents > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px]">
                {openIncidents}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="epi" className="mt-4">
          {!assignments || assignments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <HardHat className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun EPI attribué</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => {
                const category = EPI_CATEGORIES.find(c => c.value === a.catalog_item?.category);
                const isExpiringSoon = a.expected_renewal_at && 
                  new Date(a.expected_renewal_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                return (
                  <Card key={a.id} className={isExpiringSoon ? "border-orange-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{a.catalog_item?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category?.label} {a.size && `• Taille ${a.size}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Attribué le {format(new Date(a.assigned_at), "dd/MM/yyyy", { locale: fr })}
                          </p>
                        </div>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            À renouveler
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {!requests || requests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucune demande</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 10).map((r) => {
                const status = EPI_REQUEST_STATUSES.find(s => s.value === r.status);
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{r.catalog_item?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "dd/MM/yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge className={status?.color}>{status?.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          {!incidents || incidents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun signalement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 10).map((i) => {
                const status = EPI_INCIDENT_STATUSES.find(s => s.value === i.status);
                return (
                  <Card key={i.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{i.catalog_item?.name || "EPI non identifié"}</p>
                          <p className="text-sm text-muted-foreground">{i.description?.slice(0, 50)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(i.created_at), "dd/MM/yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge className={status?.color}>{status?.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Historique des attestations et remises</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RequestEpiDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        agencyId={collaborator.agency_id}
        collaboratorId={collaborator.id}
      />
      <ReportIncidentDialog
        open={incidentDialogOpen}
        onOpenChange={setIncidentDialogOpen}
        agencyId={collaborator.agency_id}
        collaboratorId={collaborator.id}
      />
      <SignAckDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        ack={currentAck || null}
        collaboratorName={collaboratorName}
      />
    </div>
  );
}
