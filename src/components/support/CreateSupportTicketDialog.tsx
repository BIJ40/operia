/**
 * Dialog de création d'un ticket support
 */
import { useState, useRef } from 'react';
import { useUserTickets } from '@/hooks/use-user-tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

interface CreateSupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated?: (ticketId: string) => void;
}

export function CreateSupportTicketDialog({
  open,
  onOpenChange,
  onTicketCreated,
}: CreateSupportTicketDialogProps) {
  const { createTicket, isCreating } = useUserTickets();
  const [newTicket, setNewTicket] = useState({
    subject: '',
    service: 'apogee',
    category: 'question',
    heatPriority: 6,
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleCreateTicket = async () => {
    const trimmedSubject = newTicket.subject.trim();
    const trimmedDescription = newTicket.description.trim();

    if (!trimmedSubject || trimmedSubject.length < 3) return;
    if (!trimmedDescription) return;

    const ticket = await createTicket(
      trimmedSubject,
      newTicket.service,
      newTicket.category,
      trimmedDescription,
      files,
      newTicket.heatPriority
    );

    if (ticket) {
      setNewTicket({ subject: '', service: 'apogee', category: 'question', heatPriority: 6, description: '' });
      setFiles([]);
      onOpenChange(false);
      onTicketCreated?.(ticket.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Créer un ticket
          </DialogTitle>
          <DialogDescription>
            Décrivez votre problème ou votre question
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service */}
          <div>
            <Label>Service concerné *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {[
                { value: 'apogee', label: '🖥️ Apogée' },
                { value: 'helpconfort', label: '🏠 HelpConfort' },
                { value: 'apporteurs', label: '🤝 Apporteurs' },
                { value: 'conseil', label: '💡 Conseil' },
                { value: 'bug_app', label: '🐛 Bug App', isRed: true },
                { value: 'autre', label: '❓ Autre' },
              ].map((svc) => (
                <Button
                  key={svc.value}
                  type="button"
                  variant="outline"
                  onClick={() => setNewTicket({ ...newTicket, service: svc.value })}
                  className={`rounded-xl border-l-4 transition-all ${
                    newTicket.service === svc.value
                      ? svc.isRed
                        ? 'border-l-red-500 bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg'
                        : 'border-l-primary bg-primary text-primary-foreground shadow-lg'
                      : 'border-l-border hover:border-l-primary hover:shadow-md'
                  }`}
                >
                  {svc.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={newTicket.category}
              onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="amelioration">Amélioration</SelectItem>
                <SelectItem value="blocage">Blocage</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Urgence */}
          <div>
            <Label>Niveau d'urgence *</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
              {[
                { value: 1, label: '🟢 Mineur' },
                { value: 3, label: '⚪ Normal' },
                { value: 6, label: '🟠 Important' },
                { value: 9, label: '🔴 Urgent' },
                { value: 12, label: '⛔ Bloquant', isRed: true },
              ].map((prio) => (
                <Button
                  key={prio.value}
                  type="button"
                  variant="outline"
                  onClick={() => setNewTicket({ ...newTicket, heatPriority: prio.value })}
                  className={`rounded-xl border-l-4 transition-all text-xs sm:text-sm ${
                    newTicket.heatPriority === prio.value
                      ? prio.isRed
                        ? 'border-l-red-600 bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg'
                        : 'border-l-primary bg-primary text-primary-foreground shadow-lg'
                      : 'border-l-border hover:border-l-primary hover:shadow-md'
                  }`}
                >
                  {prio.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Sujet */}
          <div>
            <Label htmlFor="subject">Sujet *</Label>
            <Input
              id="subject"
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              placeholder="Titre de votre demande (minimum 3 caractères)"
              required
              minLength={3}
            />
            {newTicket.subject.trim().length > 0 && newTicket.subject.trim().length < 3 && (
              <p className="text-sm text-destructive mt-1">Le sujet doit contenir au moins 3 caractères</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="Décrivez votre problème en détail"
              rows={4}
              required
            />
          </div>

          {/* Fichiers */}
          <div>
            <Label htmlFor="files">Pièces jointes (optionnel)</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreateTicket}
              disabled={
                isCreating ||
                newTicket.subject.trim().length < 3 ||
                !newTicket.description.trim()
              }
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le ticket'
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
