/**
 * Page Mes Demandes RH - Création et suivi des demandes
 */
import React, { useState } from "react";
import { Plus, FileText, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMyRequests, useCreateRequest, useCancelRequest, type RequestType, type RequestStatus } from "@/hooks/rh-employee";

const REQUEST_TYPES: { value: RequestType; label: string; emoji: string }[] = [
  { value: "EPI_RENEWAL", label: "Renouvellement EPI", emoji: "🦺" },
  { value: "LEAVE", label: "Demande de congés", emoji: "🏖️" },
  { value: "DOCUMENT", label: "Demande de document", emoji: "📄" },
  { value: "OTHER", label: "Autre demande", emoji: "📝" },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Brouillon", color: "bg-muted text-muted-foreground", icon: <FileText className="w-3 h-3" /> },
  SUBMITTED: { label: "En attente", color: "bg-amber-500/20 text-amber-700", icon: <Clock className="w-3 h-3" /> },
  APPROVED: { label: "Approuvée", color: "bg-emerald-500/20 text-emerald-700", icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { label: "Refusée", color: "bg-destructive/20 text-destructive", icon: <XCircle className="w-3 h-3" /> },
};

function CreateRequestDialog({ onClose }: { onClose: () => void }) {
  const [requestType, setRequestType] = useState<RequestType>("EPI_RENEWAL");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const createRequest = useCreateRequest();

  const handleSubmit = () => {
    const payload: Record<string, unknown> = { description };

    if (requestType === "EPI_RENEWAL") {
      payload.items = items.split(",").map((i) => i.trim()).filter(Boolean);
    } else if (requestType === "LEAVE") {
      payload.start_date = startDate;
      payload.end_date = endDate;
    }

    createRequest.mutate(
      { request_type: requestType, payload },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type de demande</Label>
        <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_TYPES.map((rt) => (
              <SelectItem key={rt.value} value={rt.value}>
                <span className="flex items-center gap-2">
                  {rt.emoji} {rt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {requestType === "EPI_RENEWAL" && (
        <div className="space-y-2">
          <Label>Équipements à renouveler (séparés par virgule)</Label>
          <Input
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Ex: Casque, Gants, Chaussures..."
          />
        </div>
      )}

      {requestType === "LEAVE" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date de fin</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Détails / Motif</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez votre demande..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createRequest.isPending}
        >
          {createRequest.isPending ? "Envoi..." : "Envoyer la demande"}
        </Button>
      </div>
    </div>
  );
}

export default function MesDemandesPage() {
  const { data: requests, isLoading, error } = useMyRequests();
  const cancelRequest = useCancelRequest();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Mes Demandes RH"
          subtitle="Vos demandes en cours et passées"
          backTo="/rh"
        />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <PageHeader
          title="Mes Demandes RH"
          subtitle="Vos demandes en cours et passées"
          backTo="/rh"
        />
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Erreur lors du chargement de vos demandes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Mes Demandes RH"
        subtitle="Créez et suivez vos demandes"
        backTo="/rh"
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {requests?.length || 0} demande{(requests?.length || 0) > 1 ? "s" : ""}
        </Badge>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle demande
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une demande</DialogTitle>
            </DialogHeader>
            <CreateRequestDialog onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {!requests || requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Aucune demande</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Créez votre première demande RH.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une demande
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const typeInfo = REQUEST_TYPES.find((rt) => rt.value === req.request_type);
            const statusInfo = STATUS_CONFIG[req.status];
            const payload = req.payload as Record<string, unknown>;

            return (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo?.emoji || "📝"}</span>
                      <div>
                        <CardTitle className="text-base">
                          {typeInfo?.label || req.request_type}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(req.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusInfo.color}>
                      {statusInfo.icon}
                      <span className="ml-1">{statusInfo.label}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {payload.description && (
                    <p className="text-sm">{String(payload.description)}</p>
                  )}

                  {payload.items && Array.isArray(payload.items) && (
                    <div className="flex flex-wrap gap-1">
                      {(payload.items as string[]).map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {payload.start_date && (
                    <p className="text-sm text-muted-foreground">
                      📅 Du {String(payload.start_date)} au {String(payload.end_date)}
                    </p>
                  )}

                  {req.decision_comment && (
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm font-medium">Commentaire:</p>
                      <p className="text-sm text-muted-foreground">{req.decision_comment}</p>
                    </div>
                  )}

                  {req.status === "SUBMITTED" && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => cancelRequest.mutate(req.id)}
                        disabled={cancelRequest.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Annuler la demande
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
