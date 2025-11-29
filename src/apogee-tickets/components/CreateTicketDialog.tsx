/**
 * Dialog de création d'un nouveau ticket Apogée
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { ApogeeModule, ApogeePriority, ApogeeTicketInsert, OwnerSide } from '../types';

interface CreateTicketDialogProps {
  open: boolean;
  onClose: () => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  onCreate: (ticket: ApogeeTicketInsert) => void;
  isCreating?: boolean;
}

export function CreateTicketDialog({
  open,
  onClose,
  modules,
  priorities,
  onCreate,
  isCreating,
}: CreateTicketDialogProps) {
  const [form, setForm] = useState<ApogeeTicketInsert>({
    element_concerne: '',
    description: '',
    module: undefined,
    priority: undefined,
    owner_side: undefined,
    h_min: undefined,
    h_max: undefined,
    kanban_status: 'BACKLOG',
    created_from: 'MANUAL',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.element_concerne.trim()) return;
    onCreate(form);
    setForm({
      element_concerne: '',
      description: '',
      module: undefined,
      priority: undefined,
      owner_side: undefined,
      h_min: undefined,
      h_max: undefined,
      kanban_status: 'BACKLOG',
      created_from: 'MANUAL',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouveau ticket Apogée
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="element">Élément concerné *</Label>
            <Input
              id="element"
              value={form.element_concerne}
              onChange={(e) => setForm({ ...form, element_concerne: e.target.value })}
              placeholder="Ex: Gestion des RDV"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Détaillez le besoin ou le problème..."
              rows={4}
            />
          </div>

          {/* Ligne module + priorité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={form.module || ''}
                onValueChange={(v) => setForm({ ...form, module: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                value={form.priority || ''}
                onValueChange={(v) => setForm({ ...form, priority: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Propriétaire */}
          <div className="space-y-2">
            <Label>Propriétaire</Label>
            <Select
              value={form.owner_side || ''}
              onValueChange={(v) => setForm({ ...form, owner_side: (v || undefined) as OwnerSide })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Qui porte le sujet ?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HC">Help Confort</SelectItem>
                <SelectItem value="APOGEE">Apogée</SelectItem>
                <SelectItem value="PARTAGE">Partagé (HC + Apogée)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="h_min">H Min (heures)</Label>
              <Input
                id="h_min"
                type="number"
                value={form.h_min || ''}
                onChange={(e) => setForm({ ...form, h_min: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h_max">H Max (heures)</Label>
              <Input
                id="h_max"
                type="number"
                value={form.h_max || ''}
                onChange={(e) => setForm({ ...form, h_max: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating || !form.element_concerne.trim()}>
              {isCreating ? 'Création...' : 'Créer le ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
