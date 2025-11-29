/**
 * Dialog de création/édition d'un collaborateur
 */

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AgencyCollaborator,
  CollaboratorRole,
  COLLABORATOR_ROLES,
  COLLABORATOR_ROLE_LABELS,
  CreateCollaboratorPayload,
  UpdateCollaboratorPayload,
} from "../types";

interface CollaboratorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator?: AgencyCollaborator | null;
  onSubmit: (data: CreateCollaboratorPayload | UpdateCollaboratorPayload) => void;
  isLoading?: boolean;
}

export function CollaboratorFormDialog({
  open,
  onOpenChange,
  collaborator,
  onSubmit,
  isLoading,
}: CollaboratorFormDialogProps) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "autre" as CollaboratorRole,
    notes: "",
  });

  useEffect(() => {
    if (collaborator) {
      setForm({
        first_name: collaborator.first_name,
        last_name: collaborator.last_name,
        email: collaborator.email || "",
        phone: collaborator.phone || "",
        role: collaborator.role,
        notes: collaborator.notes || "",
      });
    } else {
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "autre",
        notes: "",
      });
    }
  }, [collaborator, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (collaborator) {
      onSubmit({
        id: collaborator.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        role: form.role,
        notes: form.notes || null,
      });
    } else {
      onSubmit({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role,
        notes: form.notes || undefined,
      });
    }
  };

  const isValid = form.first_name.trim() && form.last_name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {collaborator ? "Modifier le collaborateur" : "Ajouter un collaborateur"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="Prénom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Nom"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle *</Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm((f) => ({ ...f, role: value as CollaboratorRole }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLABORATOR_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {COLLABORATOR_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@exemple.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="06 12 34 56 78"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes internes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
