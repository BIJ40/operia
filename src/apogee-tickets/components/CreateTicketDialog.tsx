/**
 * Dialog de création d'un nouveau ticket Apogée
 * 
 * Permissions:
 * - Tous : Élément concerné, Description, Module
 * - Développeur uniquement : H min / H max
 * - Retiré de la création : Priorité, Porteur (définis plus tard par les gestionnaires)
 */

import { useState, useEffect } from 'react';
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
import type { ApogeeModule, ApogeeTicketInsert } from '../types';
import type { TicketRole } from '../hooks/useTicketPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CreateTicketDialogProps {
  open: boolean;
  onClose: () => void;
  modules: ApogeeModule[];
  onCreate: (ticket: ApogeeTicketInsert) => void;
  isCreating?: boolean;
  /** Rôle ticket de l'utilisateur - seul developer peut renseigner h_min/h_max */
  userTicketRole?: TicketRole | null;
}

export function CreateTicketDialog({
  open,
  onClose,
  modules,
  onCreate,
  isCreating,
  userTicketRole,
}: CreateTicketDialogProps) {
  const { user } = useAuth();
  const [userFirstName, setUserFirstName] = useState<string>('');
  
  const [form, setForm] = useState<ApogeeTicketInsert>({
    element_concerne: '',
    description: '',
    module: undefined,
    h_min: undefined,
    h_max: undefined,
    kanban_status: 'BACKLOG',
    created_from: 'MANUAL',
    reported_by: '',
  });

  // Charger le prénom de l'utilisateur
  useEffect(() => {
    async function loadUserName() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.first_name) {
        setUserFirstName(data.first_name);
        setForm(prev => ({ ...prev, reported_by: data.first_name }));
      }
    }
    loadUserName();
  }, [user?.id]);

  const isDeveloper = userTicketRole === 'developer';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.element_concerne.trim() || !form.module) return;
    onCreate(form);
    setForm({
      element_concerne: '',
      description: '',
      module: undefined,
      h_min: undefined,
      h_max: undefined,
      kanban_status: 'BACKLOG',
      created_from: 'MANUAL',
      reported_by: userFirstName,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouveau ticket
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

          {/* Module (obligatoire) */}
          <div className="space-y-2">
            <Label htmlFor="module">Module *</Label>
            <Select
              value={form.module || ''}
              onValueChange={(v) => setForm({ ...form, module: v || undefined })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimations - uniquement pour les développeurs */}
          {isDeveloper && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="h_min">Estimation min (h)</Label>
                <Input
                  id="h_min"
                  type="number"
                  value={form.h_min || ''}
                  onChange={(e) => setForm({ ...form, h_min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="h_max">Estimation max (h)</Label>
                <Input
                  id="h_max"
                  type="number"
                  value={form.h_max || ''}
                  onChange={(e) => setForm({ ...form, h_max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                  step={0.5}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating || !form.element_concerne.trim() || !form.module}>
              {isCreating ? 'Création...' : 'Créer le ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
