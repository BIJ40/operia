/**
 * Dialog de création d'un ticket Gestion de Projet - Wizard interactif
 * Crée directement dans apogee_tickets (et non support_tickets)
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { safeMutation } from '@/lib/safeQuery';
import { successToast, errorToast } from '@/lib/toastHelpers';
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
import { Plus, Loader2, ArrowLeft, ArrowRight, Check, Paperclip, Bug, HelpCircle, Lightbulb } from 'lucide-react';

interface CreateProjectTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated?: (ticketId: string) => void;
}

const STEPS = [
  { id: 'type', label: 'Type' },
  { id: 'urgency', label: 'Urgence' },
  { id: 'module', label: 'Module' },
  { id: 'subject', label: 'Sujet' },
  { id: 'description', label: 'Description' },
  { id: 'attachments', label: 'Pièces jointes' },
];

const TICKET_TYPES = [
  { 
    value: 'bug', 
    label: 'Bug ou dysfonctionnement',
    description: 'Quelque chose ne fonctionne pas comme prévu',
    icon: Bug,
    color: 'text-red-500'
  },
  { 
    value: 'question', 
    label: "Question d'utilisation",
    description: "Besoin d'aide sur une fonctionnalité",
    icon: HelpCircle,
    color: 'text-blue-500'
  },
  { 
    value: 'evolution', 
    label: "Demande d'amélioration",
    description: 'Proposer une nouvelle fonctionnalité',
    icon: Lightbulb,
    color: 'text-yellow-500'
  },
];

const MODULES = [
  { value: 'apogee', label: 'Apogée (ERP)' },
  { value: 'operia', label: 'Opéria (App)' },
  { value: 'helpconfort', label: 'Portail HelpConfort' },
  { value: 'apporteurs', label: 'Module Apporteurs' },
  { value: 'autre', label: 'Autre / Je ne sais pas' },
];

const URGENCIES = [
  { value: 1, label: '🟢 Mineur', description: 'Peut attendre, faible impact' },
  { value: 3, label: '⚪ Normal', description: 'À traiter dans la semaine' },
  { value: 6, label: '🟠 Important', description: 'Impact significatif, sous 48h' },
  { value: 9, label: '🔴 Urgent', description: 'Bloque une partie du travail', isOrange: true },
  { value: 12, label: '⛔ Bloquant', description: 'Bloque tout le travail', isRed: true },
];

export function CreateProjectTicketDialog({
  open,
  onOpenChange,
  onTicketCreated,
}: CreateProjectTicketDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    ticketType: '',
    module: '',
    heatPriority: 0,
    subject: '',
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({ ticketType: '', module: '', heatPriority: 0, subject: '', description: '' });
    setFiles([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleCreateTicket = async () => {
    if (!user) {
      errorToast('Vous devez être connecté');
      return;
    }

    const trimmedSubject = formData.subject.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedSubject || trimmedSubject.length < 3) return;
    if (!trimmedDescription) return;

    setIsCreating(true);
    try {
      // Récupérer le profil utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, agence')
        .eq('id', user.id)
        .maybeSingle();

      // Créer le ticket dans apogee_tickets
      const result = await safeMutation<{ id: string }>(
        supabase
          .from('apogee_tickets')
          .insert({
            element_concerne: trimmedSubject,
            description: trimmedDescription,
            kanban_status: 'BACKLOG',
            created_from: 'support',
            created_by_user_id: user.id,
            support_initiator_user_id: user.id,
            module: formData.module === 'autre' ? null : formData.module || null,
            heat_priority: formData.heatPriority || 6,
            ticket_type: formData.ticketType || 'bug',
            needs_completion: true,
            reported_by: 'agence',
            is_urgent_support: true,
            initiator_profile: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              agence: profile.agence,
            } : null,
          } as any)
          .select('id')
          .single(),
        'CREATE_PROJECT_TICKET_FROM_SUPPORT'
      );

      if (!result.success || !result.data) {
        errorToast(result.error?.message || 'Erreur lors de la création du ticket');
        return;
      }

      const ticketId = result.data.id;

      // Upload des fichiers si présents
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `${ticketId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('apogee-ticket-attachments')
            .upload(filePath, file);

          if (!uploadError) {
            await supabase.from('apogee_ticket_attachments').insert({
              ticket_id: ticketId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              file_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      // Invalider les queries
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['user-project-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['combined-user-tickets'] });

      successToast('Ticket créé avec succès');
      resetForm();
      onOpenChange(false);
      onTicketCreated?.(ticketId);
    } catch (error) {
      errorToast('Erreur inattendue lors de la création');
    } finally {
      setIsCreating(false);
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

  const handleOptionSelect = (field: keyof typeof formData, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    setTimeout(() => goNext(), 150);
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'type':
        return !!formData.ticketType;
      case 'urgency':
        return formData.heatPriority > 0;
      case 'module':
        return !!formData.module;
      case 'subject':
        return formData.subject.trim().length >= 3;
      case 'description':
        return formData.description.trim().length > 0;
      case 'attachments':
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'type':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quel type de demande ?</Label>
            <div className="grid grid-cols-1 gap-3">
              {TICKET_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant="outline"
                    onClick={() => handleOptionSelect('ticketType', type.value)}
                    className={`h-auto py-4 px-4 rounded-xl border-l-4 transition-all justify-start text-left ${
                      formData.ticketType === type.value
                        ? 'border-l-primary bg-primary text-primary-foreground shadow-lg'
                        : 'border-l-border hover:border-l-primary hover:shadow-md'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${formData.ticketType === type.value ? 'text-primary-foreground' : type.color}`} />
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className={`text-xs ${formData.ticketType === type.value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {type.description}
                      </p>
                    </div>
                  </Button>
                );
              })}
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
                    formData.heatPriority === urg.value
                      ? urg.isRed
                        ? 'border-l-red-600 bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg'
                        : urg.isOrange
                        ? 'border-l-orange-500 bg-gradient-to-r from-orange-500 to-orange-700 text-white shadow-lg'
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

      case 'module':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quel module est concerné ?</Label>
            <div className="grid grid-cols-1 gap-2">
              {MODULES.map((mod) => (
                <Button
                  key={mod.value}
                  type="button"
                  variant="outline"
                  onClick={() => handleOptionSelect('module', mod.value)}
                  className={`h-auto py-3 px-4 rounded-xl border-l-4 transition-all justify-start ${
                    formData.module === mod.value
                      ? 'border-l-primary bg-primary text-primary-foreground shadow-lg'
                      : 'border-l-border hover:border-l-primary hover:shadow-md'
                  }`}
                >
                  {mod.label}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'subject':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Décrivez brièvement le problème</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Ex: Impossible de créer un devis depuis l'onglet client"
              className="h-12 text-base"
              autoFocus
            />
            {formData.subject.trim().length > 0 && formData.subject.trim().length < 3 && (
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
              <p className="font-medium">{formData.subject}</p>
            </div>
            <Label className="text-base font-medium">Détaillez votre demande</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez précisément le problème, les étapes pour le reproduire, et ce que vous attendiez..."
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
              <p className="text-sm"><span className="text-muted-foreground">Sujet :</span> {formData.subject}</p>
              <p className="text-sm line-clamp-2"><span className="text-muted-foreground">Description :</span> {formData.description}</p>
            </div>
            
            <Label className="text-base font-medium flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Captures d'écran ou fichiers (optionnel)
            </Label>
            <Input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
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
                  Envoyer la demande
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
            Nouvelle demande
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
