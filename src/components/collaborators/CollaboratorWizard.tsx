/**
 * Wizard de création de collaborateur en 5 étapes
 * Étape 1: Identité (nom, prénom, type, poste)
 * Étape 2: Coordonnées (email, téléphone, adresse)
 * Étape 3: Informations personnelles (naissance, sécu, urgence)
 * Étape 4: Compétences (métiers, habilitations)
 * Étape 5: Emploi (dates, liaison Apogée, notes)
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  User, 
  Phone, 
  Shield, 
  Briefcase,
  Award,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X
} from 'lucide-react';
import { CollaboratorFormData, COLLABORATOR_TYPES } from '@/types/collaborator';
import { ApogeeUserSelect } from './ApogeeUserSelect';
import { useCompetencesCatalogue, useAddCompetenceCatalogue } from '@/hooks/useRHCompetencesCatalogue';
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
  // Étape 4 - Compétences
  competences: z.array(z.string()).optional(),
  // Étape 5 - Emploi
  hiring_date: z.string().optional(),
  leaving_date: z.string().optional(),
  apogee_user_id: z.number().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TOTAL_STEPS = 5;

const STEPS = [
  { id: 1, title: 'Identité', icon: User, fields: ['first_name', 'last_name', 'type', 'role'] as const },
  { id: 2, title: 'Coordonnées', icon: Phone, fields: ['email', 'phone', 'street', 'postal_code', 'city'] as const },
  { id: 3, title: 'Infos perso', icon: Shield, fields: ['birth_date', 'birth_place', 'social_security_number', 'emergency_contact', 'emergency_phone'] as const },
  { id: 4, title: 'Compétences', icon: Award, fields: ['competences'] as const },
  { id: 5, title: 'Emploi', icon: Briefcase, fields: ['hiring_date', 'leaving_date', 'apogee_user_id', 'notes'] as const },
];

interface CollaboratorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CollaboratorFormData) => void;
  isPending: boolean;
  /** Mode édition - données initiales du collaborateur */
  initialData?: Partial<CollaboratorFormData> & { id?: string };
  /** Mode édition ou création */
  mode?: 'create' | 'edit';
}

export function CollaboratorWizard({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  initialData,
  mode = 'create',
}: CollaboratorWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const [newCompetence, setNewCompetence] = useState('');
  
  const { data: catalogueCompetences = [] } = useCompetencesCatalogue();
  const addCompetenceMutation = useAddCompetenceCatalogue();

  const defaultValues: FormValues = {
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    type: initialData?.type || 'AUTRE',
    role: initialData?.role || '',
    notes: initialData?.notes || '',
    hiring_date: initialData?.hiring_date || '',
    leaving_date: initialData?.leaving_date || '',
    birth_date: initialData?.birth_date || '',
    street: initialData?.street || '',
    postal_code: initialData?.postal_code || '',
    city: initialData?.city || '',
    social_security_number: initialData?.social_security_number || '',
    birth_place: initialData?.birth_place || '',
    emergency_contact: initialData?.emergency_contact || '',
    emergency_phone: initialData?.emergency_phone || '',
    apogee_user_id: initialData?.apogee_user_id,
    competences: initialData?.competences || [],
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Reset quand le dialog se ferme ou s'ouvre avec de nouvelles données
  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
      setCurrentStep(1);
      form.reset(defaultValues);
    } else if (initialData) {
      // Recharger les données initiales quand on ouvre en mode édition
      form.reset(defaultValues);
    }
    onOpenChange(openState);
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
    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Soumission finale avec validation de toutes les étapes
  const handleFinalSubmit = async () => {
    // Valider l'étape courante d'abord
    const isCurrentStepValid = await validateCurrentStep();
    if (!isCurrentStepValid) return;

    // Valider tout le formulaire
    const isFormValid = await form.trigger();
    if (!isFormValid) return;

    // Récupérer et soumettre les valeurs
    const values = form.getValues();
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
      competences: values.competences || [],
    });
  };

  const handleAddCompetence = async () => {
    if (!newCompetence.trim()) return;
    await addCompetenceMutation.mutateAsync(newCompetence.trim());
    const currentCompetences = form.getValues('competences') || [];
    form.setValue('competences', [...currentCompetences, newCompetence.trim()]);
    setNewCompetence('');
  };

  const toggleCompetence = (label: string) => {
    const current = form.getValues('competences') || [];
    if (current.includes(label)) {
      form.setValue('competences', current.filter(c => c !== label));
    } else {
      form.setValue('competences', [...current, label]);
    }
  };

  const selectedCompetences = form.watch('competences') || [];

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === 'edit' ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
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
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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

            {/* Étape 4 - Compétences */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Compétences & Métiers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez les compétences et métiers maîtrisés par ce collaborateur.
                </p>

                {/* Selected competences */}
                {selectedCompetences.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                    {selectedCompetences.map((comp) => (
                      <Badge key={comp} variant="secondary" className="gap-1">
                        {comp}
                        <button
                          type="button"
                          onClick={() => toggleCompetence(comp)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add new competence */}
                <div className="flex gap-2">
                  <Input
                    value={newCompetence}
                    onChange={(e) => setNewCompetence(e.target.value)}
                    placeholder="Ajouter un nouveau métier..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompetence();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCompetence}
                    disabled={!newCompetence.trim() || addCompetenceMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {/* Catalogue list */}
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {catalogueCompetences.map((comp) => (
                      <div
                        key={comp.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors",
                          selectedCompetences.includes(comp.label) && "bg-primary/10"
                        )}
                        onClick={() => toggleCompetence(comp.label)}
                      >
                        <Checkbox
                          checked={selectedCompetences.includes(comp.label)}
                          onCheckedChange={() => toggleCompetence(comp.label)}
                        />
                        <span className="text-sm">{comp.label}</span>
                        {comp.is_default && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            Par défaut
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Étape 5 - Emploi */}
            {currentStep === 5 && (
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

              {currentStep < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNext}>
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleFinalSubmit} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4 mr-1" />
                  {mode === 'edit' ? 'Enregistrer' : 'Créer le collaborateur'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
