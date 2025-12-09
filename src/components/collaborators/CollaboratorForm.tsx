/**
 * Formulaire de création/édition de collaborateur
 * RGPD: Les données sensibles sont chargées séparément via useSensitiveData
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2 } from 'lucide-react';
import { Collaborator, CollaboratorFormData, COLLABORATOR_TYPES } from '@/types/collaborator';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { ApogeeUserSelect } from './ApogeeUserSelect';

const formSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  type: z.string().min(1, 'Type requis'),
  role: z.string().min(1, 'Poste requis'),
  notes: z.string().optional(),
  hiring_date: z.string().optional(),
  leaving_date: z.string().optional(),
  birth_date: z.string().optional(),
  street: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  social_security_number: z.string().optional(),
  birth_place: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  apogee_user_id: z.number().optional(),
});

interface CollaboratorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CollaboratorFormData) => void;
  isPending: boolean;
  collaborator?: Collaborator | null;
  mode?: 'create' | 'edit';
}

export function CollaboratorForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  collaborator,
  mode = 'create',
}: CollaboratorFormProps) {
  // RGPD: Charger les données sensibles séparément en mode édition
  const { sensitiveData, isLoading: loadingSensitive } = useSensitiveData(
    mode === 'edit' ? collaborator?.id : undefined
  );

  const form = useForm<z.infer<typeof formSchema>>({
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

  // Reset form when dialog opens, collaborator changes, or sensitive data loads
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: collaborator?.first_name || '',
        last_name: collaborator?.last_name || '',
        email: collaborator?.email || '',
        phone: collaborator?.phone || '',
        type: collaborator?.type || 'AUTRE',
        role: collaborator?.role || '',
        notes: collaborator?.notes || '',
        hiring_date: collaborator?.hiring_date || '',
        leaving_date: collaborator?.leaving_date || '',
        // RGPD: Données sensibles depuis collaborator_sensitive_data
        birth_date: sensitiveData.birth_date || '',
        street: collaborator?.street || '',
        postal_code: collaborator?.postal_code || '',
        city: collaborator?.city || '',
        social_security_number: sensitiveData.social_security_number || '',
        birth_place: collaborator?.birth_place || '',
        emergency_contact: sensitiveData.emergency_contact || '',
        emergency_phone: sensitiveData.emergency_phone || '',
        apogee_user_id: collaborator?.apogee_user_id || undefined,
      });
    }
  }, [open, collaborator, sensitiveData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouveau collaborateur' : 'Modifier le collaborateur'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Identité */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom" {...field} />
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
                      <Input placeholder="Nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
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
                      <Input placeholder="06 XX XX XX XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type et Poste */}
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
                          <SelectValue placeholder="Sélectionner un type" />
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
                      <Input placeholder="Ex: Technicien plombier" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates RH */}
            <div className="grid grid-cols-3 gap-4">
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

            {/* N° Sécurité sociale */}
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

            {/* Adresse */}
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rue</FormLabel>
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

            {/* Contact d'urgence */}
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
                      <Input placeholder="06 XX XX XX XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Liaison Apogée */}
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

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes internes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Créer' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
