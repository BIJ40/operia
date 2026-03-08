/**
 * Wizard de bienvenue multi-étapes
 * Adaptatif selon le rôle utilisateur:
 * 
 * Franchiseur (N3+):
 * - Étape 0 (si must_change_password): Changement mot de passe
 * - Étape 1: Profil (nom, prénom, téléphone)
 * - Étape finale: Terminé
 * 
 * Dirigeant agence (N2 + role_agence=dirigeant):
 * - Étape 0 (si must_change_password): Changement mot de passe
 * - Étape 1: Profil
 * - Étape 2: Agence
 * - Étape 3: Équipe
 * - Étape finale: Terminé
 * 
 * Autres utilisateurs:
 * - Étape 0 (si must_change_password): Changement mot de passe
 * - Étape 1: Profil
 * - Étape finale: Terminé
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
import { Label } from '@/components/ui/label';
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
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GLOBAL_ROLES, GlobalRole } from '@/types/globalRoles';
import { OnboardingState, OnboardingPayload, OnboardingUpdateData } from '@/hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';
import { CollaboratorWizard } from '@/components/collaborators';
import { useCollaborators } from '@/hooks/useCollaborators';
import { CollaboratorFormData } from '@/types/collaborator';
import { logError } from '@/lib/logger';

// Schema pour N2 dirigeant (avec infos agence)
const managerFormSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  agence_nom_long: z.string().optional(),
  agence_adresse: z.string().optional(),
  agence_ville: z.string().optional(),
  agence_code_postal: z.string().optional(),
  agence_telephone: z.string().optional(),
  agence_email: z.string().email('Email invalide').optional().or(z.literal('')),
});

// Schema pour utilisateurs standard + franchiseurs
const standardFormSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
});

type ManagerFormValues = z.infer<typeof managerFormSchema>;

interface StepConfig {
  id: string;
  title: string;
  icon: React.ElementType;
}

interface WelcomeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: OnboardingUpdateData) => Promise<{ success: boolean }>;
  onDismiss: () => Promise<{ success: boolean }>;
  isMutating: boolean;
  initialData: OnboardingState;
  mustChangePassword?: boolean;
  onPasswordChanged?: () => void;
}

// Password validation regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]{8,100}$/;

export function WelcomeWizard({
  open,
  onOpenChange,
  onComplete,
  onDismiss,
  isMutating,
  initialData,
  mustChangePassword = false,
  onPasswordChanged,
}: WelcomeWizardProps) {
  const { agencyId } = useProfile();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCollaboratorWizard, setShowCollaboratorWizard] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [agencyInfo, setAgencyInfo] = useState<{
    agence_nom_long?: string;
    adresse?: string;
    ville?: string;
    code_postal?: string;
    contact_phone?: string;
    contact_email?: string;
  }>({});
  
  const { collaborators, createMutation } = useCollaborators();
  const createdCollaboratorsCount = collaborators?.length ?? 0;
  const isCreatingCollaborator = createMutation.isPending;

  // Determine user type
  const userRoleLevel = initialData.global_role 
    ? GLOBAL_ROLES[initialData.global_role as GlobalRole] ?? 0 
    : 0;
  const roleAgence = initialData.role_agence?.toLowerCase() ?? '';
  
  // Franchiseur = N3+ (no agency/team steps)
  const isFranchiseur = userRoleLevel >= GLOBAL_ROLES.franchisor_user;
  // Dirigeant agence = N2 + role_agence dirigeant (gets agency + team steps)
  const isDirigeantAgence = !isFranchiseur && 
    userRoleLevel >= GLOBAL_ROLES.franchisee_admin && 
    roleAgence === 'dirigeant';

  // Build dynamic steps based on role + password requirement
  const STEPS = useMemo(() => {
    const steps: StepConfig[] = [];
    
    // Password step (only if needed and not yet changed)
    if (mustChangePassword && !passwordChanged) {
      steps.push({ id: 'password', title: 'Sécurité', icon: KeyRound });
    }
    
    // Profile step (everyone)
    steps.push({ id: 'profile', title: 'Profil', icon: User });
    
    // Agency step (dirigeant agence only, NOT franchiseur)
    if (isDirigeantAgence) {
      steps.push({ id: 'agency', title: 'Agence', icon: Building2 });
      steps.push({ id: 'team', title: 'Équipe', icon: Users });
    }
    
    // Final step
    steps.push({ id: 'done', title: 'Terminé', icon: CheckCircle });
    
    return steps;
  }, [mustChangePassword, passwordChanged, isDirigeantAgence]);

  const TOTAL_STEPS = STEPS.length;
  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOTAL_STEPS - 1;
  const isPasswordStep = currentStep?.id === 'password';
  const needsPasswordFirst = mustChangePassword && !passwordChanged;

  const form = useForm<ManagerFormValues>({
    resolver: zodResolver(isDirigeantAgence ? managerFormSchema : standardFormSchema),
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
    if (isDirigeantAgence && agencyId) {
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
  }, [isDirigeantAgence, agencyId]);

  const handleOpenChange = useCallback((openState: boolean) => {
    if (!openState) return;
    onOpenChange(openState);
  }, [onOpenChange]);

  // Handle password change
  const handlePasswordSubmit = async () => {
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un symbole');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false } as any)
          .eq('id', user.id);
      }

      setPasswordChanged(true);
      setNewPassword('');
      setConfirmPassword('');
      onPasswordChanged?.();
      toast.success('Mot de passe mis à jour avec succès');
      
      // Move to next step (steps will rebuild without password step)
      // Since steps rebuild, index 0 will now be 'profile'
      setCurrentStepIndex(0);
    } catch (error: any) {
      logError('PASSWORD_CHANGE', 'Erreur changement mot de passe', { error });
      if (error.message?.includes('session') || error.message?.includes('Session')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => {
          onOpenChange(false);
          supabase.auth.signOut();
        }, 1000);
      } else {
        setPasswordError(error.message || 'Impossible de changer le mot de passe');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep?.id === 'profile') {
      const valid = await form.trigger(['first_name', 'last_name', 'phone']);
      if (!valid) return;
    } else if (currentStep?.id === 'agency') {
      await form.trigger(['agence_nom_long', 'agence_email']);
    }
    
    if (currentStepIndex < TOTAL_STEPS - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
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
    
    if (isDirigeantAgence && agencyId) {
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
      email_notifications_enabled: true,
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

  const progress = ((currentStepIndex + 1) / TOTAL_STEPS) * 100;

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
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStepIndex === index;
                const isCompleted = currentStepIndex > index;
                
                return (
                  <button
                    type="button"
                    key={step.id}
                    onClick={() => {
                      if (index < currentStepIndex) {
                        // Don't go back to password step if already changed
                        if (step.id === 'password' && passwordChanged) return;
                        setCurrentStepIndex(index);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 flex-1 transition-all",
                      index < currentStepIndex && "cursor-pointer hover:opacity-80",
                      index >= currentStepIndex && "cursor-default",
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
              
              {/* ===== PASSWORD STEP ===== */}
              {isPasswordStep && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Sécurité du compte
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vous devez définir un mot de passe personnel avant de continuer.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Le mot de passe provisoire doit être remplacé par un mot de passe personnel sécurisé.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                        placeholder="8+ caractères (MAJ, min, chiffre, symbole)"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                        placeholder="Retapez le nouveau mot de passe"
                      />
                    </div>

                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* ===== PROFILE STEP ===== */}
              {currentStep?.id === 'profile' && (
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

              {/* ===== AGENCY STEP (dirigeant agence only) ===== */}
              {currentStep?.id === 'agency' && (
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

              {/* ===== TEAM STEP (dirigeant agence only) ===== */}
              {currentStep?.id === 'team' && (
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

              {/* ===== DONE STEP ===== */}
              {currentStep?.id === 'done' && (
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
                    {(mustChangePassword || passwordChanged) && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Mot de passe</span>
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Sécurisé
                        </Badge>
                      </div>
                    )}
                    {isDirigeantAgence && (
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
                {/* Dismiss button — hidden if password change is pending */}
                {needsPasswordFirst ? (
                  <div />
                ) : (
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
                )}

                <div className="flex gap-2">
                  {currentStepIndex > 0 && !isPasswordStep && (
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
                  
                  {isPasswordStep ? (
                    <Button
                      type="button"
                      onClick={handlePasswordSubmit}
                      disabled={passwordLoading || !newPassword || !confirmPassword}
                    >
                      {passwordLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4 mr-2" />
                      )}
                      Changer le mot de passe
                    </Button>
                  ) : !isLastStep ? (
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
