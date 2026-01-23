/**
 * Wizard de création de collaborateur en 4 étapes
 * Étape 1: Identité (nom, prénom, type, poste)
 * Étape 2: Coordonnées (email, téléphone, adresse)
 * Étape 3: Informations personnelles (naissance, sécu, urgence)
 * Étape 4: Emploi (dates, liaison Apogée, notes)
 */

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  User, 
  Phone, 
  Shield, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { CollaboratorFormData, COLLABORATOR_TYPES } from '@/types/collaborator';
import { ApogeeUserSelect } from './ApogeeUserSelect';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  // Étape 1 - Identité
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  type: z.string().min(1, 'Type requis'),
  role: z.string().min(1, 'Poste requis'),
  // Étape 2 - Coordonnées
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  street: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  // Étape 3 - Infos personnelles
  birth_date: z.string().optional(),
  birth_place: z.string().optional(),
  social_security_number: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  // Étape 4 - Emploi
  hiring_date: z.string().optional(),
  leaving_date: z.string().optional(),
  apogee_user_id: z.number().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: 'Identité', icon: User, fields: ['first_name', 'last_name', 'type', 'role'] as const },
  { id: 2, title: 'Coordonnées', icon: Phone, fields: ['email', 'phone', 'street', 'postal_code', 'city'] as const },
  { id: 3, title: 'Infos personnelles', icon: Shield, fields: ['birth_date', 'birth_place', 'social_security_number', 'emergency_contact', 'emergency_phone'] as const },
  { id: 4, title: 'Emploi', icon: Briefcase, fields: ['hiring_date', 'leaving_date', 'apogee_user_id', 'notes'] as const },
];

interface CollaboratorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CollaboratorFormData) => void;
  isPending: boolean;
}

export function CollaboratorWizard({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CollaboratorWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      type: 'AUTRE',
      role: '',
      notes: '',
      hiring_date: '',
      leaving_date: '',
      birth_date: '',
      street: '',
      postal_code: '',
      city: '',
      social_security_number: '',
      birth_place: '',
      emergency_contact: '',
      emergency_phone: '',
      apogee_user_id: undefined,
    },
  });

  // Reset quand le dialog se ferme
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentStep(1);
      form.reset();
    }
    onOpenChange(open);
  };

  // Validation des champs de l'étape courante
  const validateCurrentStep = async () => {
    const currentStepConfig = STEPS.find(s => s.id === currentStep);
    if (!currentStepConfig) return true;

    const fieldsToValidate = [...currentStepConfig.fields] as (keyof FormValues)[];
    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      type: values.type as CollaboratorFormData['type'],
      email: values.email || undefined,
      phone: values.phone || undefined,
      notes: values.notes || undefined,
      hiring_date: values.hiring_date || undefined,
      leaving_date: values.leaving_date || undefined,
      birth_date: values.birth_date || undefined,
      street: values.street || undefined,
      postal_code: values.postal_code || undefined,
      city: values.city || undefined,
      social_security_number: values.social_security_number || undefined,
      birth_place: values.birth_place || undefined,
      emergency_contact: values.emergency_contact || undefined,
      emergency_phone: values.emergency_phone || undefined,
    });
  };

  const progress = (currentStep / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nouveau collaborateur
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
                <div
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center gap-1 flex-1",
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
                </div>
              );
            })}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Étape 1 - Identité */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Identité du collaborateur
                </h3>
                
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background z-50">
                            {COLLABORATOR_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poste occupé *</FormLabel>
                        <FormControl>
                          <Input placeholder="Technicien plombier" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Étape 2 - Coordonnées */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Coordonnées
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jean.dupont@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="123 rue de la Paix" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input placeholder="75001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Paris" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Étape 3 - Infos personnelles */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Informations personnelles
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ces informations sont protégées et accessibles uniquement aux personnes autorisées (RGPD).
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu de naissance</FormLabel>
                        <FormControl>
                          <Input placeholder="Paris" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="social_security_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° de Sécurité sociale</FormLabel>
                      <FormControl>
                        <Input placeholder="1 XX XX XX XXX XXX XX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergency_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact d'urgence</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du contact" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergency_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tél. urgence</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Étape 4 - Emploi */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Informations d'emploi
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hiring_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'embauche</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaving_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de départ</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="apogee_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Liaison Apogée</FormLabel>
                      <FormDescription>
                        Lier ce collaborateur à son compte technicien Apogée pour les statistiques
                      </FormDescription>
                      <FormControl>
                        <ApogeeUserSelect
                          value={field.value}
                          onChange={field.onChange}
                          collaboratorName={`${form.watch('first_name')} ${form.watch('last_name')}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes internes sur ce collaborateur..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? () => handleOpenChange(false) : handlePrevious}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {currentStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4 mr-1" />
                  Créer le collaborateur
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
