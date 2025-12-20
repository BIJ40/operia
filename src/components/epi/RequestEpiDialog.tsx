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
import { useEpiCatalog, EPI_CATEGORIES } from "@/hooks/epi/useEpiCatalog";
import {
  useCreateEpiRequest,
  EPI_REQUEST_REASONS,
  EPI_REQUEST_PRIORITIES,
} from "@/hooks/epi/useEpiRequests";
import { Loader2 } from "lucide-react";

interface RequestEpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  collaboratorId: string;
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

export function RequestEpiDialog({
  open,
  onOpenChange,
  agencyId,
  collaboratorId,
}: RequestEpiDialogProps) {
  const [catalogItemId, setCatalogItemId] = useState("");
  const [size, setSize] = useState("");
  const [reason, setReason] = useState<string>("missing");
  const [priority, setPriority] = useState<string>("normal");
  const [notes, setNotes] = useState("");

  const { data: catalog, isLoading: catalogLoading } = useEpiCatalog();
  const createRequest = useCreateEpiRequest();

  const selectedItem = catalog?.find((c) => c.id === catalogItemId);

  const handleSubmit = async () => {
    if (!catalogItemId) return;

    await createRequest.mutateAsync({
      agency_id: agencyId,
      requester_user_id: collaboratorId,
      catalog_item_id: catalogItemId,
      size: selectedItem?.requires_size ? size : null,
      reason,
      priority,
      notes: notes || null,
    });

    // Reset and close
    setCatalogItemId("");
    setSize("");
    setReason("missing");
    setPriority("normal");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demander un EPI</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* EPI Selection */}
          <div className="space-y-2">
            <Label>Type d'EPI *</Label>
            <Select value={catalogItemId} onValueChange={setCatalogItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un EPI" />
              </SelectTrigger>
              <SelectContent>
                {catalogLoading ? (
                  <div className="p-2 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  EPI_CATEGORIES.map((cat) => {
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
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Size (if required) */}
          {selectedItem?.requires_size && (
            <div className="space-y-2">
              <Label>Taille *</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une taille" />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motif *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPI_REQUEST_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPI_REQUEST_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Commentaire (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Précisions supplémentaires..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!catalogItemId || (selectedItem?.requires_size && !size) || createRequest.isPending}
          >
            {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
