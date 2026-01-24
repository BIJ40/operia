/**
 * Wizard de bienvenue multi-étapes (4 steps)
 * Étape 1: Profil (nom, prénom, téléphone, notifications)
 * Étape 2: Préférences (page d'accueil)
 * Étape 3: Orientation (adaptatif selon le rôle)
 * Étape 4: Terminé (résumé)
 */

import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  User, 
  Home, 
  Compass,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Sparkles,
  BarChart3,
  Users,
  HeadphonesIcon,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GLOBAL_ROLES, GlobalRole } from '@/types/globalRoles';
import { OnboardingState, OnboardingPayload, OnboardingUpdateData } from '@/hooks/useOnboardingState';

const formSchema = z.object({
  // Étape 1 - Profil
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  email_notifications_enabled: z.boolean(),
  // Étape 2 - Préférences
  preferred_home_route: z.string().min(1, 'Veuillez choisir une page d\'accueil'),
  // Étape 3 - Orientation (stored in payload)
  priorities: z.array(z.string()).optional(),
  orientation_acknowledged: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TOTAL_STEPS = 4;

const STEPS = [
  { id: 1, title: 'Profil', icon: User },
  { id: 2, title: 'Préférences', icon: Home },
  { id: 3, title: 'Orientation', icon: Compass },
  { id: 4, title: 'Terminé', icon: CheckCircle },
];

// Routes disponibles selon le rôle
const HOME_ROUTES = [
  { value: '/', label: 'Tableau de bord', description: 'Vue globale de votre activité', minRole: 'base_user' as GlobalRole },
  { value: '/hc-agency', label: 'Mon Agence', description: 'Pilotage de votre agence', minRole: 'franchisee_admin' as GlobalRole },
  { value: '/rh', label: 'RH & Équipe', description: 'Gestion des collaborateurs', minRole: 'franchisee_admin' as GlobalRole },
  { value: '/academy', label: 'Help! Academy', description: 'Formations et ressources', minRole: 'base_user' as GlobalRole },
  { value: '/support', label: 'Support', description: 'Aide et accompagnement', minRole: 'base_user' as GlobalRole },
  { value: '/hc-reseau', label: 'Espace Franchiseur', description: 'Gestion du réseau', minRole: 'franchisor_user' as GlobalRole },
];

// Priorités pour les managers (N2+)
const PRIORITY_OPTIONS = [
  { id: 'pilotage', label: 'Pilotage & KPI', icon: BarChart3, description: 'Suivi de performance et tableaux de bord' },
  { id: 'rh', label: 'RH & Équipe', icon: Users, description: 'Gestion des collaborateurs et plannings' },
  { id: 'support', label: 'Support & Accompagnement', icon: HeadphonesIcon, description: 'Aide et ressources du réseau' },
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
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  // Determine user level for adaptive content
  const userRoleLevel = initialData.global_role 
    ? GLOBAL_ROLES[initialData.global_role as GlobalRole] ?? 0 
    : 0;
  const isManager = userRoleLevel >= GLOBAL_ROLES.franchisee_admin; // N2+

  // Filter routes based on user role
  const availableRoutes = useMemo(() => {
    return HOME_ROUTES.filter(route => {
      const routeLevel = GLOBAL_ROLES[route.minRole] ?? 0;
      return userRoleLevel >= routeLevel;
    });
  }, [userRoleLevel]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      phone: initialData.phone || '',
      email_notifications_enabled: initialData.email_notifications_enabled ?? true,
      preferred_home_route: initialData.preferred_home_route || '/',
      priorities: [],
      orientation_acknowledged: false,
    },
  });

  // Prevent accidental close (only via buttons)
  const handleOpenChange = (openState: boolean) => {
    // Only allow programmatic close, not click outside
    if (!openState) return;
    onOpenChange(openState);
  };

  const handleNext = async () => {
    // Validate current step fields
    if (currentStep === 1) {
      const valid = await form.trigger(['first_name', 'last_name', 'phone', 'email_notifications_enabled']);
      if (!valid) return;
    } else if (currentStep === 2) {
      const valid = await form.trigger(['preferred_home_route']);
      if (!valid) return;
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
    
    const payload: OnboardingPayload = {};
    if (isManager) {
      payload.priorities = selectedPriorities;
    } else {
      payload.orientation_acknowledged = true;
    }

    const result = await onComplete({
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone || undefined,
      email_notifications_enabled: values.email_notifications_enabled,
      preferred_home_route: values.preferred_home_route,
      onboarding_payload: payload,
    });

    if (result.success) {
      onOpenChange(false);
    }
  };

  const togglePriority = (priorityId: string) => {
    setSelectedPriorities(prev => {
      if (prev.includes(priorityId)) {
        return prev.filter(p => p !== priorityId);
      }
      // Max 3 priorities
      if (prev.length >= 3) return prev;
      return [...prev, priorityId];
    });
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

                <Separator />

                <FormField
                  control={form.control}
                  name="email_notifications_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Notifications par email</FormLabel>
                        <FormDescription>
                          Recevoir les alertes importantes par email
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Étape 2 - Préférences */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    Votre page d'accueil
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choisissez la page qui s'affichera après votre connexion.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="preferred_home_route"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page d'accueil préférée *</FormLabel>
                      <div className="grid gap-3">
                        {availableRoutes.map((route) => (
                          <label
                            key={route.value}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                              field.value === route.value 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <input
                              type="radio"
                              className="mt-1"
                              checked={field.value === route.value}
                              onChange={() => field.onChange(route.value)}
                            />
                            <div className="space-y-1">
                              <div className="font-medium">{route.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {route.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Étape 3 - Orientation (adaptatif) */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    {isManager ? 'Vos priorités' : 'Vos ressources'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isManager 
                      ? 'Indiquez vos domaines de focus pour personnaliser votre expérience.'
                      : 'Voici les ressources essentielles pour bien démarrer.'}
                  </p>
                </div>

                {isManager ? (
                  // Manager view - Priority selection
                  <div className="grid gap-3">
                    {PRIORITY_OPTIONS.map((priority) => {
                      const Icon = priority.icon;
                      const isSelected = selectedPriorities.includes(priority.id);
                      const order = selectedPriorities.indexOf(priority.id) + 1;
                      
                      return (
                        <button
                          key={priority.id}
                          type="button"
                          onClick={() => togglePriority(priority.id)}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-lg border text-left transition-colors",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            {isSelected ? order : <Icon className="h-4 w-4" />}
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium">{priority.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {priority.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez jusqu'à 3 priorités dans l'ordre d'importance.
                    </p>
                  </div>
                ) : (
                  // Standard user view - Quick orientation
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <a
                        href="/academy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <GraduationCap className="h-6 w-6 text-primary" />
                        <div>
                          <div className="font-medium">Help! Academy</div>
                          <div className="text-sm text-muted-foreground">
                            Formations et ressources pour progresser
                          </div>
                        </div>
                      </a>
                      <a
                        href="/support"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <HeadphonesIcon className="h-6 w-6 text-primary" />
                        <div>
                          <div className="font-medium">Support</div>
                          <div className="text-sm text-muted-foreground">
                            Besoin d'aide ? On est là pour vous
                          </div>
                        </div>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vous pourrez toujours accéder à ces ressources depuis le menu principal.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Étape 4 - Terminé */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="space-y-2 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Tout est prêt !</h3>
                  <p className="text-sm text-muted-foreground">
                    Voici un récapitulatif de vos préférences.
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
                    <span className="text-sm text-muted-foreground">Page d'accueil</span>
                    <span className="font-medium">
                      {availableRoutes.find(r => r.value === form.getValues('preferred_home_route'))?.label || 'Tableau de bord'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Notifications email</span>
                    <Badge variant={form.getValues('email_notifications_enabled') ? 'default' : 'secondary'}>
                      {form.getValues('email_notifications_enabled') ? 'Activées' : 'Désactivées'}
                    </Badge>
                  </div>
                  {isManager && selectedPriorities.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Priorités</span>
                      <div className="flex gap-1">
                        {selectedPriorities.map((p, i) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {i + 1}. {PRIORITY_OPTIONS.find(o => o.id === p)?.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Vous pourrez modifier ces paramètres à tout moment depuis votre profil.
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
                
                {currentStep < TOTAL_STEPS ? (
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
  );
}
