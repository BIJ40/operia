/**
 * ApporteurUserCreateForm - Formulaire de création utilisateur apporteur
 * Même UX que UserCreateForm avec génération de mot de passe
 */

import { useState } from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { generateSecurePassword } from '@/lib/passwordUtils';
import { toast } from 'sonner';

const APPORTEUR_ROLE_LABELS: Record<string, string> = {
  'reader': 'Lecteur - Consultation uniquement',
  'manager': 'Gestionnaire - Création de demandes',
};

// Validation schema
const createApporteurUserSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" }).max(255, { message: "Email trop long (max 255 caractères)" }),
  password: z.string().min(8, { message: "Minimum 8 caractères requis" }).max(100, { message: "Mot de passe trop long" }),
  firstName: z.string().trim().min(1, { message: "Prénom requis" }).max(100, { message: "Prénom trop long" }),
  lastName: z.string().trim().min(1, { message: "Nom requis" }).max(100, { message: "Nom trop long" }),
  role: z.enum(['reader', 'manager']),
  sendEmail: z.boolean(),
});

export type CreateApporteurUserPayload = z.infer<typeof createApporteurUserSchema>;

export interface ApporteurUserCreateFormProps {
  onSubmit: (payload: CreateApporteurUserPayload) => void;
  isSubmitting: boolean;
}

export function ApporteurUserCreateForm({
  onSubmit,
  isSubmitting,
}: ApporteurUserCreateFormProps) {
  const [formData, setFormData] = useState<CreateApporteurUserPayload>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'manager',
    sendEmail: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateApporteurUserPayload, string>>>({});
  const [passwordCopied, setPasswordCopied] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    setPasswordCopied(false);
  };

  const handleCopyPassword = () => {
    if (formData.password) {
      navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      toast.success('Mot de passe copié');
      setTimeout(() => setPasswordCopied(false), 3000);
    }
  };

  const handleSubmit = () => {
    // Validation
    const result = createApporteurUserSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Partial<Record<keyof CreateApporteurUserPayload, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof CreateApporteurUserPayload;
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSubmit(result.data);
  };

  const isValid = formData.email && formData.password && formData.firstName && formData.lastName;

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom *</Label>
          <Input 
            value={formData.firstName} 
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} 
            placeholder="Prénom"
            disabled={isSubmitting}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input 
            value={formData.lastName} 
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} 
            placeholder="Nom"
            disabled={isSubmitting}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email *</Label>
        <Input 
          type="email" 
          value={formData.email} 
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
          placeholder="email@exemple.com"
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label>Mot de passe *</Label>
        <div className="flex gap-2">
          <Input 
            type="text" 
            value={formData.password} 
            onChange={(e) => {
              setFormData(prev => ({ ...prev, password: e.target.value }));
              setPasswordCopied(false);
            }}
            placeholder="Mot de passe"
            className="flex-1 font-mono text-sm"
            disabled={isSubmitting}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            onClick={handleCopyPassword} 
            disabled={isSubmitting || !formData.password}
            title="Copier le mot de passe"
          >
            {passwordCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleGeneratePassword} 
            disabled={isSubmitting}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Générer
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          20 caractères avec majuscules, minuscules, chiffres et symboles
        </p>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label>Rôle apporteur *</Label>
        <Select 
          value={formData.role} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as 'reader' | 'manager' }))}
          disabled={isSubmitting}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            {Object.entries(APPORTEUR_ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id="sendEmail" 
          checked={formData.sendEmail}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendEmail: checked === true }))}
          disabled={isSubmitting}
        />
        <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
          Envoyer l'email de bienvenue avec identifiants
        </Label>
      </div>

      <div className="pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={!isValid || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Création en cours..." : "Créer l'utilisateur"}
        </Button>
      </div>
    </div>
  );
}
