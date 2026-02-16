/**
 * Wizard de bienvenue multi-étapes
 * Adaptatif selon le rôle utilisateur (N2+ = 4 étapes, autres = 2 étapes)
 * 
 * N2+ (franchisés/admins):
 * - Étape 1: Profil (nom, prénom, téléphone)
 * - Étape 2: Agence (nom long, adresse, téléphone)
 * - Étape 3: Équipe (création collaborateurs)
 * - Étape 4: Terminé
 * 
 * Autres utilisateurs:
 * - Étape 1: Profil
 * - Étape 2: Terminé
 */

import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  User, 
  Building2, 
  Users,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Sparkles,
  Plus,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GLOBAL_ROLES, GlobalRole } from '@/types/globalRoles';
import { OnboardingState, OnboardingPayload, OnboardingUpdateData } from '@/hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CollaboratorWizard } from '@/components/collaborators';
import { useCollaborators } from '@/hooks/useCollaborators';
import { CollaboratorFormData } from '@/types/collaborator';

// Schema pour N2+ (avec infos agence)
const managerFormSchema = z.object({
  // Étape 1 - Profil
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  // Étape 2 - Agence
  agence_nom_long: z.string().optional(),
  agence_adresse: z.string().optional(),
  agence_ville: z.string().optional(),
  agence_code_postal: z.string().optional(),
  agence_telephone: z.string().optional(),
  agence_email: z.string().email('Email invalide').optional().or(z.literal('')),
});

// Schema pour utilisateurs standard
const standardFormSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
});

type ManagerFormValues = z.infer<typeof managerFormSchema>;
type StandardFormValues = z.infer<typeof standardFormSchema>;

interface StepConfig {
  id: number;
  title: string;
  icon: React.ElementType;
}

// Steps pour N2+
const MANAGER_STEPS: StepConfig[] = [
  { id: 1, title: 'Profil', icon: User },
  { id: 2, title: 'Agence', icon: Building2 },
  { id: 3, title: 'Équipe', icon: Users },
  { id: 4, title: 'Terminé', icon: CheckCircle },
];

// Steps pour utilisateurs standard
const STANDARD_STEPS: StepConfig[] = [
  { id: 1, title: 'Profil', icon: User },
  { id: 2, title: 'Terminé', icon: CheckCircle },
];

interface WelcomeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: OnboardingUpdateData) => Promise<{ success: boolean }>;
  onDismiss: () => Promise<{ success: boolean }>;
  isMutating: boolean;
  initialData: OnboardingState;
}

export function WelcomeWizard({
  open,
  onOpenChange,
  onComplete,
  onDismiss,
  isMutating,
  initialData,
}: WelcomeWizardProps) {
  const { agencyId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCollaboratorWizard, setShowCollaboratorWizard] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<{
    agence_nom_long?: string;
    adresse?: string;
    ville?: string;
    code_postal?: string;
    contact_phone?: string;
    contact_email?: string;
  }>({});
  
  // Fetch collaborators pour afficher le nombre créé
  const { collaborators, createMutation } = useCollaborators();
  const createdCollaboratorsCount = collaborators?.length ?? 0;
  const isCreatingCollaborator = createMutation.isPending;

  // Determine user level for adaptive content
  // CRITICAL: Only dirigeants (franchise owners) get the full manager wizard
  // Commercial, assistante, etc. are employees and should NOT manage agency/team
  const userRoleLevel = initialData.global_role 
    ? GLOBAL_ROLES[initialData.global_role as GlobalRole] ?? 0 
    : 0;
  const roleAgence = initialData.role_agence?.toLowerCase() ?? '';
  
  // N3+ = always manager (franchiseur/admin), N2 = only if role_agence is dirigeant
  const isManager = userRoleLevel >= GLOBAL_ROLES.franchisor_user || 
    (userRoleLevel >= GLOBAL_ROLES.franchisee_admin && roleAgence === 'dirigeant');

  // Sélection des steps selon le rôle
  const STEPS = isManager ? MANAGER_STEPS : STANDARD_STEPS;
  const TOTAL_STEPS = STEPS.length;

  const form = useForm<ManagerFormValues>({
    resolver: zodResolver(isManager ? managerFormSchema : standardFormSchema),
    defaultValues: {
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      phone: initialData.phone || '',
      agence_nom_long: '',
      agence_adresse: '',
      agence_ville: '',
      agence_code_postal: '',
      agence_telephone: '',
      agence_email: '',
    },
  });

  // Fetch agency info on mount
  useMemo(() => {
    if (isManager && agencyId) {
      // Fetch from apogee_agencies
      supabase
        .from('apogee_agencies')
        .select('label, adresse, ville, code_postal, contact_phone, contact_email')
        .eq('id', agencyId)
        .single()
        .then(({ data }) => {
          if (data) {
            setAgencyInfo({
              agence_nom_long: data.label || '',
              adresse: data.adresse || '',
              ville: data.ville || '',
              code_postal: data.code_postal || '',
              contact_phone: data.contact_phone || '',
              contact_email: data.contact_email || '',
            });
            form.setValue('agence_nom_long', data.label || '');
            form.setValue('agence_adresse', data.adresse || '');
            form.setValue('agence_ville', data.ville || '');
            form.setValue('agence_code_postal', data.code_postal || '');
            form.setValue('agence_telephone', data.contact_phone || '');
            form.setValue('agence_email', data.contact_email || '');
          }
        });
    }
  }, [isManager, agencyId]);

  // Prevent accidental close (only via buttons)
  const handleOpenChange = useCallback((openState: boolean) => {
    // Only allow programmatic close, not click outside or X button
    if (!openState) return;
    onOpenChange(openState);
  }, [onOpenChange]);

  const handleNext = async () => {
    // Validate current step fields
    if (currentStep === 1) {
      const valid = await form.trigger(['first_name', 'last_name', 'phone']);
      if (!valid) return;
    } else if (currentStep === 2 && isManager) {
      // Agency step - optional validation
      await form.trigger(['agence_nom_long', 'agence_email']);
    }
    
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDismiss = async () => {
    const result = await onDismiss();
    if (result.success) {
      onOpenChange(false);
    }
  };

  const handleComplete = async () => {
    const values = form.getValues();
    
    // Save agency info if manager
    if (isManager && agencyId) {
      try {
        await supabase
          .from('apogee_agencies')
          .update({
            adresse: values.agence_adresse || null,
            ville: values.agence_ville || null,
            code_postal: values.agence_code_postal || null,
            contact_phone: values.agence_telephone || null,
            contact_email: values.agence_email || null,
          })
          .eq('id', agencyId);
      } catch (err) {
        console.error('[Onboarding] Error saving agency info:', err);
      }
    }

    const payload: OnboardingPayload = {
      orientation_acknowledged: true,
    };

    const result = await onComplete({
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone || undefined,
      email_notifications_enabled: true, // Activé par défaut
      onboarding_payload: payload,
    });

    if (result.success) {
      onOpenChange(false);
    }
  };

  const handleCollaboratorCreated = (data: CollaboratorFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowCollaboratorWizard(false);
      },
    });
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  // Déterminer si on est sur la dernière étape
  const isLastStep = currentStep === TOTAL_STEPS;
  const isTeamStep = isManager && currentStep === 3;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Bienvenue sur Help! Connect
            </DialogTitle>
          </DialogHeader>

          {/* Progress bar et étapes */}
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="flex justify-between">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <button
                    type="button"
                    key={step.id}
                    onClick={() => {
                      // Allow going back but not forward
                      if (step.id < currentStep) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 flex-1 transition-all",
                      step.id < currentStep && "cursor-pointer hover:opacity-80",
                      step.id >= currentStep && "cursor-default",
                      isActive && "text-primary",
                      isCompleted && "text-primary",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        isActive && "border-primary bg-primary/10",
                        isCompleted && "border-primary bg-primary text-primary-foreground",
                        !isActive && !isCompleted && "border-muted-foreground/30"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Étape 1 - Profil */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Vos informations
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vérifions que vos informations de base sont à jour.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Jean" {...field} autoFocus />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Dupont" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormDescription>
                          Pour vous contacter en cas de besoin urgent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Étape 2 - Agence (N2+ uniquement) */}
              {currentStep === 2 && isManager && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Informations de l'agence
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Complétez les informations de votre agence pour faciliter le suivi.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="agence_nom_long"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'agence</FormLabel>
                        <FormControl>
                          <Input placeholder="Help Confort Lyon" {...field} disabled />
                        </FormControl>
                        <FormDescription>
                          Le nom de l'agence ne peut pas être modifié ici
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="agence_adresse"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="12 rue du Commerce" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agence_code_postal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="69000" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agence_ville"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Lyon" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="agence_telephone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone agence</FormLabel>
                          <FormControl>
                            <Input placeholder="04 78 00 00 00" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agence_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email agence</FormLabel>
                          <FormControl>
                            <Input placeholder="contact@helpconfort-lyon.fr" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Étape 3 - Équipe (N2+ uniquement) */}
              {isTeamStep && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Votre équipe
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez vos collaborateurs pour bénéficier de toutes les fonctionnalités RH.
                      Vous pourrez toujours en ajouter plus tard.
                    </p>
                  </div>

                  {/* Liste des collaborateurs créés */}
                  {createdCollaboratorsCount > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {createdCollaboratorsCount} collaborateur{createdCollaboratorsCount > 1 ? 's' : ''} déjà enregistré{createdCollaboratorsCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          <Check className="h-3 w-3 mr-1" />
                          Équipe créée
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Bouton ajouter collaborateur */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-auto py-6"
                    onClick={() => setShowCollaboratorWizard(true)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Ajouter un collaborateur</div>
                        <div className="text-sm text-muted-foreground">
                          Technicien, assistante, commercial...
                        </div>
                      </div>
                    </div>
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Vous pourrez ajouter d'autres collaborateurs depuis le module RH à tout moment.
                  </p>
                </div>
              )}

              {/* Étape Terminé */}
              {isLastStep && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Tout est prêt !</h3>
                    <p className="text-sm text-muted-foreground">
                      Voici un récapitulatif de vos informations.
                    </p>
                  </div>

                  <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nom</span>
                      <span className="font-medium">
                        {form.getValues('first_name')} {form.getValues('last_name')}
                      </span>
                    </div>
                    {form.getValues('phone') && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Téléphone</span>
                        <span className="font-medium">{form.getValues('phone')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Notifications email</span>
                      <Badge variant="default">Activées</Badge>
                    </div>
                    {isManager && (
                      <>
                        <Separator />
                        {form.getValues('agence_ville') && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Agence</span>
                            <span className="font-medium">
                              {form.getValues('agence_ville')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Équipe</span>
                          <Badge variant={createdCollaboratorsCount > 0 ? 'default' : 'secondary'}>
                            {createdCollaboratorsCount} collaborateur{createdCollaboratorsCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Vous pourrez modifier ces informations à tout moment depuis votre profil.
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isMutating}
                  className="text-muted-foreground"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Faire plus tard
                </Button>

                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={isMutating}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                  )}
                  
                  {!isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isMutating}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleComplete}
                      disabled={isMutating}
                    >
                      {isMutating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Terminer
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Wizard création collaborateur */}
      {showCollaboratorWizard && (
        <CollaboratorWizard
          open={showCollaboratorWizard}
          onOpenChange={setShowCollaboratorWizard}
          onSubmit={handleCollaboratorCreated}
          isPending={isCreatingCollaborator}
          mode="create"
        />
      )}
    </>
  );
}
