import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Info } from 'lucide-react';
import { generateSecurePassword } from '@/lib/passwordUtils';
import { ROLE_AGENCE_LABELS, N1_ASSIGNABLE_ROLES } from '@/components/admin/users/user-full-dialog/constants';

// Postes disponibles en mode agence pour admin (N3+ créant dans une agence)
const AGENCY_MODE_ROLES = ['dirigeant', 'administratif', 'commercial', 'technicien'];

// Labels pour mode salarié (N2 crée un N1) — filtrés depuis la source unique
const EMPLOYEE_MODE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_AGENCE_LABELS).filter(([key]) => (N1_ASSIGNABLE_ROLES as readonly string[]).includes(key))
);

/** Génère un pseudo normalisé : prenom.nom-slug_agence */
function generateUsername(firstName: string, lastName: string, agencySlug: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprime accents
      .replace(/[^a-z0-9]/g, '');
  const fn = normalize(firstName);
  const ln = normalize(lastName);
  const slug = agencySlug?.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'agence';
  if (!fn || !ln) return '';
  return `${fn}.${ln}-${slug}`;
}

// Validation schema — email optionnel en mode employé
const createUserSchema = z.object({
  email: z.string().trim().max(255).optional(),
  username: z.string().trim().max(100).optional(),
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
  creatorRoleLevel?: number;
  agencyMode?: boolean;
  defaultValues?: Partial<CreateUserPayload>;
  /** Mode salarié: N2 crée un N1 — postes limités, rôle système forcé */
  employeeMode?: boolean;
  /** Slug agence du créateur (pour générer le pseudo) */
  creatorAgencySlug?: string;
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
  defaultValues,
  employeeMode = false,
  creatorAgencySlug,
}: UserCreateFormProps) {
  // Postes disponibles selon le mode
  const availableRoleAgence = employeeMode
    ? Object.keys(EMPLOYEE_MODE_LABELS)
    : agencyMode 
      ? AGENCY_MODE_ROLES 
      : Object.keys(ROLE_AGENCE_LABELS);
  
  // Labels de postes selon le mode
  const roleAgenceLabels = employeeMode ? EMPLOYEE_MODE_LABELS : ROLE_AGENCE_LABELS;
  
  // N2 créé obligatoirement des utilisateurs agence (N1)
  const isN2Creator = creatorRoleLevel === 2 || employeeMode;
  
  // En mode salarié, forcer franchisee_user (N1)
  const defaultRole = employeeMode 
    ? 'franchisee_user' as GlobalRole 
    : (assignableRoles.length > 0 ? assignableRoles[0] : 'base_user');
  
  const [formData, setFormData] = useState<CreateUserPayload>({
    email: defaultValues?.email || '',
    username: '',
    password: '',
    firstName: defaultValues?.firstName || '',
    lastName: defaultValues?.lastName || '',
    agence: defaultAgency || defaultValues?.agence || '',
    roleAgence: defaultValues?.roleAgence || '',
    globalRole: employeeMode ? 'franchisee_user' : (defaultValues?.globalRole || defaultRole),
    sendEmail: defaultValues?.sendEmail ?? !employeeMode, // Pas d'email par défaut en mode salarié (email interne)
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserPayload, string>>>({});

  // Auto-générer le pseudo en mode employé quand prénom/nom changent
  const agencySlug = creatorAgencySlug || defaultAgency || formData.agence || '';
  const generatedUsername = useMemo(
    () => employeeMode ? generateUsername(formData.firstName, formData.lastName, agencySlug) : '',
    [employeeMode, formData.firstName, formData.lastName, agencySlug]
  );

  useEffect(() => {
    if (employeeMode && generatedUsername) {
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [employeeMode, generatedUsername]);

  const handleRoleAgenceChange = (newRoleAgence: string) => {
    setFormData(prev => ({ ...prev, roleAgence: newRoleAgence }));
  };

  const handleGeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generateSecurePassword() }));
  };

  const handleSubmit = () => {
    // En mode employé, l'email est auto-généré côté backend
    const dataToValidate = { ...formData };
    if (employeeMode) {
      // Générer email interne si pas d'email saisi
      if (!dataToValidate.email) {
        dataToValidate.email = `${generatedUsername}@internal.helpconfort.services`;
      }
    }

    // Validation
    const result = createUserSchema.safeParse(dataToValidate);
    if (!result.success) {
      const newErrors: Partial<Record<keyof CreateUserPayload, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof CreateUserPayload;
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    // Validation personnalisée
    if (!employeeMode && (!dataToValidate.email || !dataToValidate.email.includes('@'))) {
      setErrors(prev => ({ ...prev, email: 'Email requis' }));
      return;
    }
    if (employeeMode && !generatedUsername) {
      setErrors(prev => ({ ...prev, firstName: 'Prénom requis pour générer le pseudo' }));
      return;
    }
    
    setErrors({});
    onSubmit(result.data);
  };

  const isValid = employeeMode
    ? formData.password && formData.firstName && formData.lastName
    : formData.email && formData.password && formData.firstName && formData.lastName;

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

      {/* Mode employé : pseudo auto-généré + email optionnel */}
      {employeeMode ? (
        <>
          <div className="space-y-2">
            <Label>Nom d'utilisateur (auto-généré)</Label>
            <Input 
              value={generatedUsername}
              readOnly
              className="bg-muted font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Ce pseudo sera l'identifiant de connexion du salarié
            </p>
          </div>
          <div className="space-y-2">
            <Label>Email (optionnel)</Label>
            <Input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
              disabled={isSubmitting}
              placeholder="Si vide, un email interne sera généré"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide si le salarié n'a pas d'email. Un email interne sera créé automatiquement.
            </p>
          </div>
        </>
      ) : (
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
      )}

      <div className="space-y-2">
        <Label>Mot de passe *</Label>
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
        <p className="text-xs text-muted-foreground">
          {employeeMode 
            ? 'Ce mot de passe sera communiqué au salarié par le responsable d\'agence' 
            : '18 caractères avec majuscules, minuscules, chiffres et symboles'}
        </p>
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
              <SelectItem key={value} value={value}>{roleAgenceLabels[value] || value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {employeeMode && formData.roleAgence && (
          <p className="text-xs text-muted-foreground">
            Pré-rempli depuis la fiche salarié. Modifiable si besoin.
          </p>
        )}
        {errors.roleAgence && <p className="text-xs text-destructive">{errors.roleAgence}</p>}
      </div>

      {/* Rôle système */}
      {!isN2Creator && (
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

      {!employeeMode && (
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="sendEmail" 
            checked={formData.sendEmail}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendEmail: checked === true }))}
            disabled={isSubmitting}
          />
          <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
            Envoyer l'email de bienvenue avec mot de passe
          </Label>
        </div>
      )}

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