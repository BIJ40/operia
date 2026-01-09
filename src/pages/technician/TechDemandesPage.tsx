/**
 * Page Demandes Technicien Mobile
 */
import { FileText, ArrowLeft, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMyCollaborator, useMyRequests } from "@/hooks/rh-employee";
import { CollaboratorNotConfigured } from "@/components/rh-employee/CollaboratorNotConfigured";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: "En attente", color: "bg-amber-500/20 text-amber-700" },
  APPROVED: { label: "Approuvée", color: "bg-emerald-500/20 text-emerald-700" },
  REJECTED: { label: "Refusée", color: "bg-destructive/20 text-destructive" },
  CANCELLED: { label: "Annulée", color: "bg-muted text-muted-foreground" },
};

export default function TechDemandesPage() {
  const { data: collaborator, isLoading: loadingCollab } = useMyCollaborator();
  const { data: requests, isLoading: loadingRequests } = useMyRequests();

  if (loadingCollab || loadingRequests) {
    return <div className="p-4 space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  }

  if (!collaborator) {
    return <div className="p-4 space-y-4"><Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><CollaboratorNotConfigured /></div>;
  }

  const activeRequests = requests?.filter(r => !r.archived_at) || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold flex-1">Mes demandes</h1>
        <Link to="/rh/demande"><Button size="sm"><Plus className="w-4 h-4 mr-1" />Nouvelle</Button></Link>
      </div>
      {!activeRequests.length ? (
        <Card><CardContent className="py-12 text-center"><FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" /><p>Aucune demande</p></CardContent></Card>
      ) : (
        <div className="space-y-2">{activeRequests.map((req) => {
          const status = STATUS_MAP[req.status] || STATUS_MAP.SUBMITTED;
          return (
            <Card key={req.id}><CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{req.request_type}</p>
                <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{format(new Date(req.created_at), "dd MMM yyyy", { locale: fr })}</p>
            </CardContent></Card>
          );
        })}</div>
      )}
    </div>
  );
}
