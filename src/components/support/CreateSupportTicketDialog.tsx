/**
 * Dialog de création d'un ticket support - Wizard interactif
 */
import { useState } from 'react';
import { useUserTickets } from '@/hooks/use-user-tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Loader2, ArrowLeft, ArrowRight, Check, Paperclip } from 'lucide-react';

interface CreateSupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated?: (ticketId: string) => void;
}

const STEPS = [
  { id: 'service', label: 'Service' },
  { id: 'category', label: 'Catégorie' },
  { id: 'urgency', label: 'Urgence' },
  { id: 'subject', label: 'Sujet' },
  { id: 'description', label: 'Description' },
  { id: 'attachments', label: 'Pièces jointes' },
];

const SERVICES = [
  { value: 'apogee', label: '🖥️ Apogée' },
  { value: 'helpconfort', label: '🏠 HelpConfort' },
  { value: 'apporteurs', label: '🤝 Apporteurs' },
  { value: 'conseil', label: '💡 Conseil' },
  { value: 'bug_app', label: '🐛 Bug App', isRed: true },
  { value: 'autre', label: '❓ Autre' },
];

const CATEGORIES = [
  { value: 'question', label: '❓ Question' },
  { value: 'bug', label: '🐛 Bug' },
  { value: 'amelioration', label: '✨ Amélioration' },
  { value: 'blocage', label: '🚫 Blocage' },
  { value: 'autre', label: '📝 Autre' },
];

const URGENCIES = [
  { value: 1, label: '🟢 Mineur', description: 'Peut attendre' },
  { value: 3, label: '⚪ Normal', description: 'Dans la semaine' },
  { value: 6, label: '🟠 Important', description: 'Sous 48h' },
  { value: 9, label: '🔴 Urgent', description: 'Sous 24h' },
  { value: 12, label: '⛔ Bloquant', description: 'Immédiat', isRed: true },
];

export function CreateSupportTicketDialog({
  open,
  onOpenChange,
  onTicketCreated,
}: CreateSupportTicketDialogProps) {
  const { createTicket, isCreating } = useUserTickets();
  const [currentStep, setCurrentStep] = useState(0);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    service: '',
    category: '',
    heatPriority: 0,
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const resetForm = () => {
    setCurrentStep(0);
    setNewTicket({ subject: '', service: '', category: '', heatPriority: 0, description: '' });
    setFiles([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

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
      resetForm();
      onOpenChange(false);
      onTicketCreated?.(ticket.id);
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOptionSelect = (field: string, value: string | number) => {
    setNewTicket({ ...newTicket, [field]: value });
    // Auto-advance après sélection
    setTimeout(() => goNext(), 150);
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'service':
        return !!newTicket.service;
      case 'category':
        return !!newTicket.category;
      case 'urgency':
        return newTicket.heatPriority > 0;
      case 'subject':
        return newTicket.subject.trim().length >= 3;
      case 'description':
        return newTicket.description.trim().length > 0;
      case 'attachments':
        return true; // Optional
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'service':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quel service est concerné ?</Label>
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.map((svc) => (
                <Button
                  key={svc.value}
                  type="button"
                  variant="outline"
                  onClick={() => handleOptionSelect('service', svc.value)}
                  className={`h-auto py-4 rounded-xl border-l-4 transition-all ${
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
        );

      case 'category':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quelle est la catégorie ?</Label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  type="button"
                  variant="outline"
                  onClick={() => handleOptionSelect('category', cat.value)}
                  className={`h-auto py-4 rounded-xl border-l-4 transition-all ${
                    newTicket.category === cat.value
                      ? 'border-l-primary bg-primary text-primary-foreground shadow-lg'
                      : 'border-l-border hover:border-l-primary hover:shadow-md'
                  }`}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'urgency':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quel est le niveau d'urgence ?</Label>
            <div className="grid grid-cols-1 gap-2">
              {URGENCIES.map((urg) => (
                <Button
                  key={urg.value}
                  type="button"
                  variant="outline"
                  onClick={() => handleOptionSelect('heatPriority', urg.value)}
                  className={`h-auto py-3 px-4 rounded-xl border-l-4 transition-all justify-start ${
                    newTicket.heatPriority === urg.value
                      ? urg.isRed
                        ? 'border-l-red-600 bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg'
                        : 'border-l-primary bg-primary text-primary-foreground shadow-lg'
                      : 'border-l-border hover:border-l-primary hover:shadow-md'
                  }`}
                >
                  <span className="font-medium">{urg.label}</span>
                  <span className="ml-auto text-xs opacity-70">{urg.description}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 'subject':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quel est le sujet de votre demande ?</Label>
            <Input
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              placeholder="Titre de votre demande (minimum 3 caractères)"
              className="h-12 text-base"
              autoFocus
            />
            {newTicket.subject.trim().length > 0 && newTicket.subject.trim().length < 3 && (
              <p className="text-sm text-destructive">Minimum 3 caractères requis</p>
            )}
            {canProceed() && (
              <Button onClick={goNext} className="w-full">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        );

      case 'description':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Sujet :</p>
              <p className="font-medium">{newTicket.subject}</p>
            </div>
            <Label className="text-base font-medium">Décrivez votre problème en détail</Label>
            <Textarea
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="Expliquez le contexte, les étapes pour reproduire le problème, ce que vous attendiez..."
              rows={5}
              className="text-base"
              autoFocus
            />
            {canProceed() && (
              <Button onClick={goNext} className="w-full">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        );

      case 'attachments':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">Sujet :</span> {newTicket.subject}</p>
              <p className="text-sm line-clamp-2"><span className="text-muted-foreground">Description :</span> {newTicket.description}</p>
            </div>
            
            <Label className="text-base font-medium flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Ajouter des pièces jointes (optionnel)
            </Label>
            <Input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="h-12"
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {files.length} fichier(s) sélectionné(s)
              </p>
            )}
            
            <Button 
              onClick={handleCreateTicket} 
              disabled={isCreating}
              className="w-full h-12 text-base"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Créer le ticket
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouveau ticket
          </DialogTitle>
          <DialogDescription>
            Étape {currentStep + 1} sur {STEPS.length} — {STEPS[currentStep].label}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={idx <= currentStep ? 'text-primary font-medium' : ''}
              >
                {idx + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="py-4 min-h-[200px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
