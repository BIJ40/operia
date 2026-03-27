import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { getSuggestedGlobalRole, validateRoleAgenceCoherence } from '@/lib/roleAgenceMapping';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, KeyRound, AlertCircle, UserX, RefreshCw } from 'lucide-react';
import { generateSecurePassword } from '@/lib/passwordUtils';
import { ApogeeUserSelect } from '@/components/collaborators/ApogeeUserSelect';

import { ROLE_AGENCE_LABELS, getEditableRoleAgenceEntries } from '@/components/admin/users/user-full-dialog/constants';

// Validation schema
const editUserSchema = z.object({
  firstName: z.string().trim().min(1, { message: "Prénom requis" }).max(100, { message: "Prénom trop long" }),
  lastName: z.string().trim().min(1, { message: "Nom requis" }).max(100, { message: "Nom trop long" }),
  email: z.string().trim().email({ message: "Email invalide" }).max(255, { message: "Email trop long" }),
  agence: z.string(),
  roleAgence: z.string(),
  globalRole: z.string(),
});

export type UpdateUserPayload = {
  /** Email (si modifié, est synchronisé aussi côté authentification) */
  email?: string;
  first_name?: string;
  last_name?: string;
  agence?: string;
  /** UUID de l'agence (source de vérité pour les jointures / plans) */
  agency_id?: string | null;
  role_agence?: string;
  global_role?: GlobalRole;
  apogee_user_id?: number | null;
};

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: GlobalRole | null;
  role_agence: string | null;
  is_active: boolean | null;
  must_change_password: boolean | null;
  apogee_user_id?: number | null;
  
}

export interface UserEditFormProps {
  user: UserProfile;
  onSave: (payload: UpdateUserPayload) => void;
  onUpdateEmail: (newEmail: string) => void;
  onResetPassword: (newPassword: string, sendEmail?: boolean) => void;
  isSubmitting: boolean;
  isEmailPending: boolean;
  isPasswordPending: boolean;
  availableAgencies: Agency[];
  assignableRoles: GlobalRole[];
  showModulesEditor?: boolean;
  readOnlyFields?: string[];
  canEditRoleAgence?: boolean;
}

export function UserEditForm({
  user,
  onSave,
  onUpdateEmail,
  onResetPassword,
  isSubmitting,
  isEmailPending,
  isPasswordPending,
  availableAgencies,
  assignableRoles,
  readOnlyFields = [],
  canEditRoleAgence = true,
}: UserEditFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    agence: '',
    roleAgence: '',
    globalRole: 'base_user' as GlobalRole,
    apogeeUserId: undefined as number | undefined,
  });
  const [newPassword, setNewPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  // Synchroniser formData avec user
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        agence: user.agence || '',
        roleAgence: user.role_agence || '',
        globalRole: user.global_role || 'base_user',
        apogeeUserId: user.apogee_user_id ?? undefined,
      });
    }
  }, [user]);

  const isFieldReadOnly = (field: string) => readOnlyFields.includes(field);

  const handleSubmit = () => {
    // Validation
    const result = editUserSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Partial<Record<keyof typeof formData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof typeof formData;
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const normalizedSlug = (formData.agence || '').toLowerCase();
    const resolvedAgencyId = normalizedSlug
      ? (availableAgencies.find((a) => a.slug?.toLowerCase() === normalizedSlug)?.id ?? null)
      : null;

    const normalizedAgence = formData.agence?.trim() || null;

    onSave({
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      agence: normalizedAgence || '',
      agency_id: resolvedAgencyId,
      role_agence: formData.roleAgence,
      global_role: formData.globalRole as GlobalRole,
      apogee_user_id: formData.apogeeUserId ?? null,
      apogee_user_id: formData.apogeeUserId ?? null,
    });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-2 flex-wrap">
        {user?.must_change_password && (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Mot de passe provisoire non changé
          </Badge>
        )}
        {user?.is_active === false && (
          <Badge variant="destructive">
            <UserX className="w-3 h-3 mr-1" />
            Compte désactivé
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom</Label>
          <Input 
            value={formData.firstName} 
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} 
            disabled={isSubmitting || isFieldReadOnly('firstName')}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input 
            value={formData.lastName} 
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} 
            disabled={isSubmitting || isFieldReadOnly('lastName')}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <div className="flex gap-2">
          <Input 
            type="email" 
            value={formData.email} 
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
            className="flex-1"
            disabled={isFieldReadOnly('email')}
          />
          {!isFieldReadOnly('email') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onUpdateEmail(formData.email)} 
              disabled={formData.email === user?.email || isEmailPending}
            >
              <Mail className="w-4 h-4 mr-1" />
              Modifier email
            </Button>
          )}
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label>Agence</Label>
        <Select 
          value={formData.agence || "none"} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v === "none" ? "" : v }))}
          disabled={isSubmitting || isFieldReadOnly('agence')}
        >
          <SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="none">Aucune agence</SelectItem>
            {availableAgencies
              .filter(a => a.slug && a.slug.trim() !== "")
              .map(agency => (
                <SelectItem key={agency.id} value={agency.slug}>
                  {agency.label}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
        {errors.agence && <p className="text-xs text-destructive">{errors.agence}</p>}
      </div>

      <div className="space-y-2">
        <Label>Poste occupé</Label>
        <Select 
          value={formData.roleAgence} 
          onValueChange={(v) => {
            const suggested = getSuggestedGlobalRole(v);
            setFormData(prev => ({
              ...prev,
              roleAgence: v,
              ...(suggested ? { globalRole: suggested } : {}),
            }));
          }} 
          disabled={!canEditRoleAgence || isSubmitting}
        >
          <SelectTrigger><SelectValue placeholder="Sélectionner un poste" /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            {getEditableRoleAgenceEntries(formData.globalRole).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!canEditRoleAgence && (
          <p className="text-xs text-muted-foreground">Seul Admin et N+1 peuvent modifier ce champ</p>
        )}
        {errors.roleAgence && <p className="text-xs text-destructive">{errors.roleAgence}</p>}
      </div>

      {/* Liaison Apogée - visible uniquement si l'utilisateur a une agence */}
      {formData.agence && (
        <ApogeeUserSelect
          value={formData.apogeeUserId}
          onChange={(id) => setFormData(prev => ({ ...prev, apogeeUserId: id }))}
          agencySlug={formData.agence}
          label="Liaison Apogée"
          collaboratorName={`${formData.firstName} ${formData.lastName}`}
        />
      )}

      {/* Coherence warning */}
      {(() => {
        const warning = validateRoleAgenceCoherence(
          formData.roleAgence,
          formData.globalRole,
          formData.agence || null
        );
        return warning ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>
          </div>
        ) : null;
      })()}

      <div className="space-y-2">
        <Label>Rôle global (plafond)</Label>
        <Select 
          value={formData.globalRole} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, globalRole: v as GlobalRole }))}
          disabled={isSubmitting || isFieldReadOnly('globalRole')}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-background z-50">
            {assignableRoles.map(role => (
              <SelectItem key={role} value={role}>{VISIBLE_ROLE_LABELS[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Définit le niveau d'autorité maximum de l'utilisateur</p>
        {errors.globalRole && <p className="text-xs text-destructive">{errors.globalRole}</p>}
      </div>


      <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <Label className="flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Réinitialiser le mot de passe
        </Label>
        <div className="flex gap-2">
          <Input 
            type="text" 
            placeholder="Nouveau mot de passe (min 8 car.)" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            className="flex-1"
            disabled={isPasswordPending}
          />
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setNewPassword(generateSecurePassword())}
            disabled={isPasswordPending}
            title="Générer un mot de passe sécurisé"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Générer
          </Button>
          <Button 
            variant="default" 
            onClick={() => { 
              // Validation côté client
              const hasLower = /[a-z]/.test(newPassword);
              const hasUpper = /[A-Z]/.test(newPassword);
              const hasDigit = /\d/.test(newPassword);
              const hasSymbol = /[!@#$%&*_+\-]/.test(newPassword);
              const validLength = newPassword.length >= 8;
              
              if (!validLength || !hasLower || !hasUpper || !hasDigit || !hasSymbol) {
                const missing: string[] = [];
                if (!validLength) missing.push('8 caractères minimum');
                if (!hasLower) missing.push('une minuscule');
                if (!hasUpper) missing.push('une majuscule');
                if (!hasDigit) missing.push('un chiffre');
                if (!hasSymbol) missing.push('un symbole (!@#$%&*_+-)');
                toast.error(`Mot de passe invalide. Il manque : ${missing.join(', ')}`);
                return;
              }
              
              onResetPassword(newPassword, sendEmail); 
              setNewPassword(''); 
            }} 
            disabled={!newPassword || isPasswordPending}
            title="Appliquer le nouveau mot de passe"
          >
            {isPasswordPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <KeyRound className="w-4 h-4 mr-1" />}
            Appliquer
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Exigences : 8 caractères min. avec majuscule, minuscule, chiffre et symbole (!@#$%&*_+-)
        </p>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="sendResetEmail" 
            checked={sendEmail}
            onCheckedChange={(checked) => setSendEmail(checked === true)}
            disabled={isPasswordPending}
          />
          <Label htmlFor="sendResetEmail" className="text-sm font-normal cursor-pointer">
            Envoyer le nouveau mot de passe par email
          </Label>
        </div>
      </div>

      <div className="pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement en cours...
            </>
          ) : (
            "Enregistrer les modifications"
          )}
        </Button>
      </div>
    </div>
  );
}
