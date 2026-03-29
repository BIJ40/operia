/**
 * Dialog de création d'un ticket Gestion de Projet - Wizard interactif
 * Crée directement dans apogee_tickets (et non support_tickets)
 */
import { useState, useMemo } from 'react';
import { notifyNewTicket } from '@/utils/notifyNewTicket';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { safeMutation } from '@/lib/safeQuery';
import { successToast, errorToast } from '@/lib/toastHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Loader2, ArrowLeft, ArrowRight, Check, Paperclip, Bug, HelpCircle, Lightbulb, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    color: 'text-warm-orange'
  },
  { 
    value: 'question', 
    label: "Question d'utilisation",
    description: "Besoin d'aide sur une fonctionnalité",
    icon: HelpCircle,
    color: 'text-warm-blue'
  },
  { 
    value: 'evolution', 
    label: "Demande d'amélioration",
    description: 'Proposer une nouvelle fonctionnalité',
    icon: Lightbulb,
    color: 'text-warm-teal'
  },
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
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    ticketType: '',
    module: 'AUTRE',
    heatPriority: 0,
    subject: '',
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [moduleSearch, setModuleSearch] = useState('');

  // Charger les modules depuis la table apogee_modules
  const { data: modules = [] } = useQuery({
    queryKey: ['apogee-modules-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_modules')
        .select('id, label')
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Filtrer les modules selon la recherche
  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return modules;
    const search = moduleSearch.toLowerCase();
    return modules.filter(m => 
      m.label.toLowerCase().includes(search) ||
      m.id.toLowerCase().includes(search)
    );
  }, [modules, moduleSearch]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({ ticketType: '', module: 'AUTRE', heatPriority: 0, subject: '', description: '' });
    setFiles([]);
    setModuleSearch('');
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
        .select('first_name, last_name, agency_id')
        .eq('id', user.id)
        .maybeSingle();

      // Créer le ticket dans apogee_tickets
      const result = await safeMutation<{ id: string; ticket_number: number }>(
        supabase
          .from('apogee_tickets')
          .insert({
            element_concerne: trimmedSubject,
            description: trimmedDescription,
            kanban_status: 'USER',
            created_from: 'support',
            created_by_user_id: user.id,
            support_initiator_user_id: user.id,
            module: formData.module || null,
            heat_priority: formData.heatPriority || 6,
            ticket_type: formData.ticketType || 'bug',
            needs_completion: true,
            reported_by: profile?.first_name?.toUpperCase() || user.email || 'INCONNU',
            is_urgent_support: true,
            initiator_profile: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              agence: profile.agency_id,
            } : null,
          } as any)
          .select('id, ticket_number')
          .single(),
        'CREATE_PROJECT_TICKET_FROM_SUPPORT'
      );

      if (!result.success || !result.data) {
        errorToast(result.error?.message || 'Erreur lors de la création du ticket');
        return;
      }

      const ticketId = result.data.id;

      // Fire-and-forget notification
      notifyNewTicket({
        ticket_id: ticketId,
        ticket_number: result.data.ticket_number,
        subject: trimmedSubject,
        description: trimmedDescription,
        heat_priority: formData.heatPriority || 6,
        module: formData.module || undefined,
        created_from: 'support',
        initiator_name: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
        initiator_email: user.email,
      });

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

  const handleModuleSelect = (moduleId: string) => {
    setFormData({ ...formData, module: moduleId });
    setModuleSearch('');
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

  const getModuleLabel = (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    return mod?.label || moduleId;
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
                const isSelected = formData.ticketType === type.value;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant="outline"
                    onClick={() => handleOptionSelect('ticketType', type.value)}
                    className={cn(
                      "h-auto py-4 px-4 rounded-2xl border-l-4 transition-all justify-start text-left",
                      isSelected
                        ? 'border-l-warm-blue bg-warm-blue/90 text-white shadow-lg'
                        : 'border-l-border/50 hover:border-l-warm-blue/60 hover:shadow-md hover:bg-muted/30'
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center mr-3",
                      isSelected ? 'bg-white/20' : 'bg-muted/50'
                    )}>
                      <Icon className={cn("w-5 h-5", isSelected ? 'text-white' : type.color)} />
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className={cn("text-xs", isSelected ? 'text-white/70' : 'text-muted-foreground')}>
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
              {URGENCIES.map((urg) => {
                const isSelected = formData.heatPriority === urg.value;
                return (
                  <Button
                    key={urg.value}
                    type="button"
                    variant="outline"
                    onClick={() => handleOptionSelect('heatPriority', urg.value)}
                    className={cn(
                      "h-auto py-3 px-4 rounded-2xl border-l-4 transition-all justify-start",
                      isSelected
                        ? urg.isRed
                          ? 'border-l-warm-orange bg-warm-orange/90 text-white shadow-lg'
                          : urg.isOrange
                          ? 'border-l-warm-orange/70 bg-warm-orange/80 text-white shadow-lg'
                          : 'border-l-warm-blue bg-warm-blue/90 text-white shadow-lg'
                        : 'border-l-border/50 hover:border-l-warm-blue/60 hover:shadow-md hover:bg-muted/30'
                    )}
                  >
                    <span className="font-medium">{urg.label}</span>
                    <span className={cn("ml-auto text-xs", isSelected ? 'text-white/70' : 'text-muted-foreground')}>{urg.description}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case 'module':
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">Quel module est concerné ?</Label>
            <p className="text-sm text-muted-foreground">
              Sélectionné : <span className="font-medium text-warm-blue">{getModuleLabel(formData.module)}</span>
            </p>
            
            <Command className="rounded-2xl border border-border/50">
              <CommandInput 
                placeholder="Rechercher un module..." 
                value={moduleSearch}
                onValueChange={setModuleSearch}
                className="rounded-t-2xl"
              />
              <CommandList>
                <CommandEmpty>Aucun module trouvé</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {filteredModules.map((mod) => (
                      <CommandItem
                        key={mod.id}
                        value={mod.label}
                        onSelect={() => handleModuleSelect(mod.id)}
                        className={cn(
                          "cursor-pointer rounded-xl mx-1 my-0.5",
                          formData.module === mod.id && "bg-warm-blue/10 text-warm-blue font-medium"
                        )}
                      >
                        <Check className={cn(
                          "mr-2 h-4 w-4",
                          formData.module === mod.id ? "opacity-100 text-warm-blue" : "opacity-0"
                        )} />
                        {mod.label}
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
            
            {canProceed() && (
              <Button onClick={goNext} className="w-full rounded-xl bg-warm-blue/90 hover:bg-warm-blue">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
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
              className="h-12 text-base rounded-xl border-border/50"
              autoFocus
            />
            {formData.subject.trim().length > 0 && formData.subject.trim().length < 3 && (
              <p className="text-sm text-warm-orange">Minimum 3 caractères requis</p>
            )}
            {canProceed() && (
              <Button onClick={goNext} className="w-full rounded-xl bg-warm-blue/90 hover:bg-warm-blue">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        );

      case 'description':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-warm-blue/5 rounded-xl border border-warm-blue/20">
              <p className="text-sm text-muted-foreground">Sujet :</p>
              <p className="font-medium">{formData.subject}</p>
            </div>
            <Label className="text-base font-medium">Détaillez votre demande</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez précisément le problème, les étapes pour le reproduire, et ce que vous attendiez..."
              rows={5}
              className="text-base rounded-xl border-border/50"
              autoFocus
            />
            {canProceed() && (
              <Button onClick={goNext} className="w-full rounded-xl bg-warm-blue/90 hover:bg-warm-blue">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        );

      case 'attachments':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-warm-blue/5 rounded-xl border border-warm-blue/20 space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">Sujet :</span> {formData.subject}</p>
              <p className="text-sm line-clamp-2"><span className="text-muted-foreground">Description :</span> {formData.description}</p>
            </div>
            
            <Label className="text-base font-medium flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-warm-teal/15 flex items-center justify-center">
                <Paperclip className="w-3.5 h-3.5 text-warm-teal" />
              </div>
              Captures d'écran ou fichiers (optionnel)
            </Label>
            <Input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="h-12 rounded-xl border-border/50"
            />
            {files.length > 0 && (
              <p className="text-sm text-warm-green">
                {files.length} fichier(s) sélectionné(s)
              </p>
            )}
            
            <Button 
              onClick={handleCreateTicket} 
              disabled={isCreating}
              className="w-full h-12 text-base rounded-xl bg-warm-green/90 hover:bg-warm-green"
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
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-warm-blue/15 flex items-center justify-center">
              <Plus className="w-5 h-5 text-warm-blue" />
            </div>
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
