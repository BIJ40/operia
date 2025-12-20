import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMyEpiAssignments } from "@/hooks/epi/useEpiAssignments";
import {
  useCreateEpiIncident,
  EPI_INCIDENT_TYPES,
  EPI_INCIDENT_SEVERITIES,
} from "@/hooks/epi/useEpiIncidents";
import { useEpiCatalog, EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import { Loader2, AlertTriangle } from "lucide-react";

interface ReportIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  collaboratorId: string;
}

export function ReportIncidentDialog({
  open,
  onOpenChange,
  agencyId,
  collaboratorId,
}: ReportIncidentDialogProps) {
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [catalogItemId, setCatalogItemId] = useState<string>("");
  const [incidentType, setIncidentType] = useState<string>("worn");
  const [severity, setSeverity] = useState<string>("minor");
  const [description, setDescription] = useState("");
  const [epiSource, setEpiSource] = useState<"assigned" | "other">("assigned");

  const { data: assignments } = useMyEpiAssignments(collaboratorId);
  const { data: catalog } = useEpiCatalog();
  const createIncident = useCreateEpiIncident();

  const selectedAssignment = assignments?.find((a) => a.id === assignmentId);

  const handleSubmit = async () => {
    if (!description.trim()) return;

    await createIncident.mutateAsync({
      agency_id: agencyId,
      reporter_user_id: collaboratorId,
      assignment_id: epiSource === "assigned" ? assignmentId || null : null,
      catalog_item_id:
        epiSource === "assigned"
          ? selectedAssignment?.catalog_item_id || null
          : catalogItemId || null,
      incident_type: incidentType,
      severity,
      description,
    });

    // Reset and close
    setAssignmentId("");
    setCatalogItemId("");
    setIncidentType("worn");
    setSeverity("minor");
    setDescription("");
    setEpiSource("assigned");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Signaler un EPI défaillant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* EPI Source */}
          <div className="space-y-2">
            <Label>L'EPI concerné</Label>
            <RadioGroup
              value={epiSource}
              onValueChange={(v) => setEpiSource(v as "assigned" | "other")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assigned" id="assigned" />
                <Label htmlFor="assigned" className="font-normal">
                  EPI qui m'est attribué
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal">
                  Autre / non attribué
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* EPI Selection - Assigned */}
          {epiSource === "assigned" && (
            <div className="space-y-2">
              <Label>Sélectionner l'EPI</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir parmi mes EPI" />
                </SelectTrigger>
                <SelectContent>
                  {assignments?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.catalog_item?.name} {a.size && `(${a.size})`}
                    </SelectItem>
                  ))}
                  {(!assignments || assignments.length === 0) && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Aucun EPI attribué
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* EPI Selection - Other */}
          {epiSource === "other" && (
            <div className="space-y-2">
              <Label>Type d'EPI</Label>
              <Select value={catalogItemId} onValueChange={setCatalogItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {EPI_CATEGORIES.map((cat) => {
                    const items = catalog?.filter((c) => c.category === cat.value) || [];
                    if (items.length === 0) return null;
                    return (
                      <React.Fragment key={cat.value}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {cat.label}
                        </div>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Incident Type */}
          <div className="space-y-2">
            <Label>Type d'incident *</Label>
            <Select value={incidentType} onValueChange={setIncidentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPI_INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Gravité *</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPI_INCIDENT_SEVERITIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème constaté..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || createIncident.isPending}
            variant="destructive"
          >
            {createIncident.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer le signalement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
