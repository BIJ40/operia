import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EpiCatalogItem } from "@/hooks/epi/useEpiCatalog";
import { EpiAssignment } from "@/hooks/epi/useEpiAssignments";
import { format } from "date-fns";
import { Calendar, HardHat, Trash2 } from "lucide-react";

interface EpiCellEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorName: string;
  epiItem: EpiCatalogItem;
  existingAssignment?: EpiAssignment | null;
  onSave: (data: {
    size?: string;
    assigned_at?: string;
    serial_number?: string;
    notes?: string;
  }) => void;
  onRemove?: () => void;
  onMarkNotApplicable?: (value: boolean) => void;
  isNotApplicable?: boolean;
}

export function EpiCellEditDialog({
  open,
  onOpenChange,
  collaboratorName,
  epiItem,
  existingAssignment,
  onSave,
  onRemove,
  onMarkNotApplicable,
  isNotApplicable = false,
}: EpiCellEditDialogProps) {
  const [size, setSize] = useState("");
  const [assignedAt, setAssignedAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [notApplicable, setNotApplicable] = useState(isNotApplicable);

  useEffect(() => {
    if (existingAssignment) {
      setSize(existingAssignment.size || "");
      setAssignedAt(existingAssignment.assigned_at?.split("T")[0] || format(new Date(), "yyyy-MM-dd"));
      setSerialNumber(existingAssignment.serial_number || "");
      setNotes(existingAssignment.notes || "");
    } else {
      setSize("");
      setAssignedAt(format(new Date(), "yyyy-MM-dd"));
      setSerialNumber("");
      setNotes("");
    }
    setNotApplicable(isNotApplicable);
  }, [existingAssignment, isNotApplicable, open]);

  const handleSave = () => {
    if (notApplicable && onMarkNotApplicable) {
      onMarkNotApplicable(true);
      onOpenChange(false);
      return;
    }

    onSave({
      size: size || undefined,
      assigned_at: assignedAt,
      serial_number: serialNumber || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const handleNotApplicableChange = (checked: boolean) => {
    setNotApplicable(checked);
    if (checked && onMarkNotApplicable) {
      onMarkNotApplicable(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            {epiItem.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pour {collaboratorName}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Not applicable checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notApplicable"
              checked={notApplicable}
              onCheckedChange={(checked) => handleNotApplicableChange(!!checked)}
            />
            <Label htmlFor="notApplicable" className="text-sm text-muted-foreground">
              Non applicable pour ce collaborateur (gris)
            </Label>
          </div>

          {!notApplicable && (
            <>
              {/* Date d'attribution */}
              <div className="space-y-2">
                <Label htmlFor="assignedAt" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de mise à disposition
                </Label>
                <Input
                  id="assignedAt"
                  type="date"
                  value={assignedAt}
                  onChange={(e) => setAssignedAt(e.target.value)}
                />
              </div>

              {/* Taille (si applicable) */}
              {epiItem.requires_size && (
                <div className="space-y-2">
                  <Label htmlFor="size">Taille</Label>
                  {epiItem.available_sizes?.length ? (
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une taille..." />
                      </SelectTrigger>
                      <SelectContent>
                        {epiItem.available_sizes.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="size"
                      placeholder="Ex: 42, M, L..."
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                    />
                  )}
                </div>
              )}

              {/* N° de série */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber">N° de série / lot (optionnel)</Label>
                <Input
                  id="serialNumber"
                  placeholder="Optionnel"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Commentaires..."
                  className="resize-none"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {existingAssignment && onRemove && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Retirer
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave}>
              {existingAssignment ? "Modifier" : "Attribuer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
