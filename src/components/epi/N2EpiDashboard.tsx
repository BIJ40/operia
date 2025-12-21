import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  HardHat,
  AlertTriangle,
  FileCheck,
  Package,
  ClipboardList,
  Users,
  Calendar,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useEpiRequests } from "@/hooks/epi/useEpiRequests";
import { useEpiIncidents } from "@/hooks/epi/useEpiIncidents";
import { useEpiAssignments } from "@/hooks/epi/useEpiAssignments";
import { useEpiAcknowledgements, useGenerateMonthlyAcks } from "@/hooks/epi/useEpiAcknowledgements";
import { useEpiStock } from "@/hooks/epi/useEpiStock";
import { EpiRequestsTable } from "./EpiRequestsTable";
import { EpiIncidentsTable } from "./EpiIncidentsTable";
import { EpiAssignmentsTable } from "./EpiAssignmentsTable";
import { EpiStockTable } from "./EpiStockTable";
import { EpiAcksTable } from "./EpiAcksTable";
import { AssignEpiDialog } from "./AssignEpiDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface N2EpiDashboardProps {
  agencyId: string;
  currentUserId: string;
}

export function N2EpiDashboard({ agencyId, currentUserId }: N2EpiDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const currentMonth = format(new Date(), "yyyy-MM") + "-01";

  const { data: requests, isLoading: reqLoading } = useEpiRequests({ agencyId });
  const { data: incidents, isLoading: incLoading } = useEpiIncidents({ agencyId });
  const { data: assignments, isLoading: assLoading } = useEpiAssignments({ agencyId });
  const { data: acks, isLoading: ackLoading } = useEpiAcknowledgements({ agencyId, month: currentMonth });
  const { data: stock, isLoading: stockLoading } = useEpiStock(agencyId);

  const generateAcks = useGenerateMonthlyAcks();

  const isLoading = reqLoading || incLoading || assLoading || ackLoading || stockLoading;

  // KPIs
  const pendingRequests = requests?.filter((r) => r.status === "pending").length || 0;
  const openIncidents = incidents?.filter((i) => i.status === "open").length || 0;
  const activeAssignments = assignments?.filter((a) => a.status === "active").length || 0;
  const renewalsDue = assignments?.filter((a) => {
    if (!a.expected_renewal_at) return false;
    return new Date(a.expected_renewal_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }).length || 0;
  const pendingAcks = acks?.filter((a) => a.status === "pending").length || 0;
  const overdueAcks = acks?.filter((a) => a.status === "overdue").length || 0;
  const lowStock = stock?.filter((s) => s.quantity <= s.reorder_threshold).length || 0;

  const handleGenerateMonthlyAcks = () => {
    generateAcks.mutate({ agencyId, month: currentMonth });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activeAssignments}</p>
                <p className="text-xs text-muted-foreground">EPI attribués</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={renewalsDue > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 ${renewalsDue > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{renewalsDue}</p>
                <p className="text-xs text-muted-foreground">À renouveler</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={pendingRequests > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className={`h-5 w-5 ${pendingRequests > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{pendingRequests}</p>
                <p className="text-xs text-muted-foreground">Demandes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={openIncidents > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${openIncidents > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{openIncidents}</p>
                <p className="text-xs text-muted-foreground">Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={pendingAcks > 0 ? "border-blue-200 bg-blue-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileCheck className={`h-5 w-5 ${pendingAcks > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{pendingAcks}</p>
                <p className="text-xs text-muted-foreground">Signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={overdueAcks > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className={`h-5 w-5 ${overdueAcks > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{overdueAcks}</p>
                <p className="text-xs text-muted-foreground">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={lowStock > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className={`h-5 w-5 ${lowStock > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-2xl font-bold">{lowStock}</p>
                <p className="text-xs text-muted-foreground">Stock bas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <AssignEpiDialog 
        open={assignDialogOpen} 
        onOpenChange={setAssignDialogOpen} 
        agencyId={agencyId} 
      />

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setAssignDialogOpen(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Attribuer un EPI
        </Button>
        <Button
          variant="outline"
          onClick={handleGenerateMonthlyAcks}
          disabled={generateAcks.isPending}
        >
          {generateAcks.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4 mr-2" />
          )}
          Générer attestations du mois
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Demandes
            {pendingRequests > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {pendingRequests}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incidents" className="relative">
            Incidents
            {openIncidents > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {openIncidents}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assignments">Attributions</TabsTrigger>
          <TabsTrigger value="acks">Attestations</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pending Requests */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Demandes en attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EpiRequestsTable
                  requests={requests?.filter((r) => r.status === "pending").slice(0, 5) || []}
                  agencyId={agencyId}
                  currentUserId={currentUserId}
                  compact
                />
              </CardContent>
            </Card>

            {/* Open Incidents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Incidents ouverts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EpiIncidentsTable
                  incidents={incidents?.filter((i) => i.status === "open").slice(0, 5) || []}
                  agencyId={agencyId}
                  currentUserId={currentUserId}
                  compact
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <EpiRequestsTable
                requests={requests || []}
                agencyId={agencyId}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <EpiIncidentsTable
                incidents={incidents || []}
                agencyId={agencyId}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <EpiAssignmentsTable
                assignments={assignments || []}
                agencyId={agencyId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acks" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <EpiAcksTable
                acks={acks || []}
                agencyId={agencyId}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <EpiStockTable stock={stock || []} agencyId={agencyId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
