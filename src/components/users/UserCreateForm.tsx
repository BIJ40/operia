import { useState } from 'react';
import { z } from 'zod';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw } from 'lucide-react';
import { generateSecurePassword } from '@/lib/passwordUtils';

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'technicien': 'Technicien',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

// Postes disponibles uniquement en mode agence (pas tete_de_reseau ni externe)
const AGENCY_MODE_ROLES = ['dirigeant', 'assistante', 'commercial', 'technicien'];

// Validation schema
const createUserSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" }).max(255, { message: "Email trop long (max 255 caractères)" }),
  password: z.string().min(8, { message: "Minimum 8 caractères requis" }).max(100, { message: "Mot de passe trop long" }),
  firstName: z.string().trim().min(1, { message: "Prénom requis" }).max(100, { message: "Prénom trop long" }),
  lastName: z.string().trim().min(1, { message: "Nom requis" }).max(100, { message: "Nom trop long" }),
  agence: z.string(),
  roleAgence: z.string(),
  globalRole: z.string(),
  sendEmail: z.boolean(),
});

export type CreateUserPayload = z.infer<typeof createUserSchema>;

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

export interface UserCreateFormProps {
  onSubmit: (payload: CreateUserPayload) => void;
  isSubmitting: boolean;
  availableAgencies: Agency[];
  assignableRoles: GlobalRole[];
  showAgencySelector?: boolean;
  defaultAgency?: string;
  creatorRoleLevel?: number; // Niveau du créateur pour filtrer les postes
  /** Si true, restreint les postes à ceux valides pour une agence (exclut tete_de_reseau, externe) */
  agencyMode?: boolean;
}

export function UserCreateForm({
  onSubmit,
  isSubmitting,
  availableAgencies,
  assignableRoles,
  showAgencySelector = true,
  defaultAgency,
  creatorRoleLevel = 0,
  agencyMode = false,
}: UserCreateFormProps) {
  // Postes disponibles selon le mode
  const availableRoleAgence = agencyMode 
    ? AGENCY_MODE_ROLES 
    : Object.keys(ROLE_AGENCE_LABELS);
  // N2 créé obligatoirement des utilisateurs agence (N1)
  const isN2Creator = creatorRoleLevel === 2;
  
  // Valeur par défaut intelligente : le rôle assignable le plus bas
  const defaultRole = assignableRoles.length > 0 ? assignableRoles[0] : 'base_user';
  
  const [formData, setFormData] = useState<CreateUserPayload>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    agence: defaultAgency || '',
    roleAgence: '',
    globalRole: isN2Creator ? 'franchisee_user' : defaultRole,
    sendEmail: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserPayload, string>>>({});

  // Logique automatique : technicien/assistante → franchisee_user (N1)
  const handleRoleAgenceChange = (newRoleAgence: string) => {
    setFormData(prev => {
      const shouldAutoAssignN1 = ['technicien', 'assistante'].includes(newRoleAgence);
      return {
        ...prev,
        roleAgence: newRoleAgence,
        globalRole: shouldAutoAssignN1 ? 'franchisee_user' : prev.globalRole,
      };
    });
  };

  const isGlobalRoleAutoAssigned = ['technicien', 'assistante'].includes(formData.roleAgence);

  const handleGeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generateSecurePassword() }));
  };

  const handleSubmit = () => {
    // Validation
    const result = createUserSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Partial<Record<keyof CreateUserPayload, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof CreateUserPayload;
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
            disabled={isSubmitting}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input 
            value={formData.lastName} 
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} 
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
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label>Mot de passe provisoire *</Label>
        <div className="flex gap-2">
          <Input 
            type="text" 
            value={formData.password} 
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} 
            className="flex-1"
            disabled={isSubmitting}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword} disabled={isSubmitting}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Générer
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">18 caractères avec majuscules, minuscules, chiffres et symboles</p>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      {showAgencySelector && (
        <div className="space-y-2">
          <Label>Agence</Label>
          <Select 
            value={formData.agence || "none"} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v === "none" ? "" : v }))}
            disabled={isSubmitting}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">Aucune agence</SelectItem>
              {availableAgencies
                .filter(a => a.slug && a.slug.trim() !== "")
                .map(a => (
                  <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
          {errors.agence && <p className="text-xs text-destructive">{errors.agence}</p>}
        </div>
      )}

      {/* Poste occupé - visible pour tous */}
      <div className="space-y-2">
        <Label>Poste occupé</Label>
        <Select 
          value={formData.roleAgence} 
          onValueChange={handleRoleAgenceChange}
          disabled={isSubmitting}
        >
          <SelectTrigger><SelectValue placeholder="Sélectionner un poste" /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            {availableRoleAgence.map((value) => (
              <SelectItem key={value} value={value}>{ROLE_AGENCE_LABELS[value]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isGlobalRoleAutoAssigned && (
          <p className="text-xs text-muted-foreground">
            ℹ️ Rôle système attribué automatiquement : Utilisateur franchisé (N1)
          </p>
        )}
        {errors.roleAgence && <p className="text-xs text-destructive">{errors.roleAgence}</p>}
      </div>

      {/* Rôle système - masqué si N2 ou technicien/assistante */}
      {!isN2Creator && !isGlobalRoleAutoAssigned && (
        <div className="space-y-2">
          <Label>Rôle système</Label>
          <Select 
            value={formData.globalRole} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, globalRole: v }))}
            disabled={isSubmitting}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background z-50">
              {assignableRoles.map(role => (
                <SelectItem key={role} value={role}>{VISIBLE_ROLE_LABELS[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.globalRole && <p className="text-xs text-destructive">{errors.globalRole}</p>}
        </div>
      )}

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id="sendEmail" 
          checked={formData.sendEmail}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendEmail: checked === true }))}
          disabled={isSubmitting}
        />
        <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
          Envoyer l'email de bienvenue avec mot de passe provisoire
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
