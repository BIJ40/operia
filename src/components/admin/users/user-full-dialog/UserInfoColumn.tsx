/**
 * Left column of UserFullDialog — user information form
 * Extracted from UserFullDialog.tsx — no behavioral change.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield, Building2, User, Mail, Briefcase,
  Loader2, KeyRound, RefreshCw, AlertCircle
} from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { getVisibleRoleLabel, getVisibleRoleColor, VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { generateSecurePassword } from '@/lib/passwordUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApogeeUserSelect } from '@/components/collaborators/ApogeeUserSelect';
import { Agency, ROLE_AGENCE_LABELS, UserFormData } from './constants';
import { getSuggestedGlobalRole, validateRoleAgenceCoherence } from '@/lib/roleAgenceMapping';

interface UserInfoColumnProps {
  editMode: boolean;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  firstName: string;
  lastName: string;
  userEmail: string;
  agencyLabel?: string | null;
  roleAgence?: string | null;
  globalRole: GlobalRole | null;
  mustChangePassword: boolean;
  agencies: Agency[];
  assignableRoles: GlobalRole[];
  onSaveUser?: (data: {
    first_name: string;
    last_name: string;
    email: string;
    agence: string;
    agency_id: string | null;
    role_agence: string;
    global_role: GlobalRole;
    apogee_user_id: number | null;
  }) => void;
  onUpdateEmail?: (newEmail: string) => void;
  onResetPassword?: (newPassword: string, sendEmail: boolean) => void;
  isSaving: boolean;
  isEmailPending: boolean;
  isPasswordPending: boolean;
}

export function UserInfoColumn({
  editMode,
  formData,
  setFormData,
  firstName,
  lastName,
  userEmail,
  agencyLabel,
  roleAgence,
  globalRole,
  mustChangePassword,
  agencies,
  assignableRoles,
  onSaveUser,
  onUpdateEmail,
  onResetPassword,
  isSaving,
  isEmailPending,
  isPasswordPending,
}: UserInfoColumnProps) {
  const [newPassword, setNewPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const coherenceWarning = validateRoleAgenceCoherence(formData.roleAgence, formData.globalRole, formData.agence || null);

  const handleSaveUser = () => {
    if (!onSaveUser) return;
    const normalizedAgence = formData.agence?.trim() || null;
    const normalizedSlug = (normalizedAgence || '').toLowerCase();
    const resolvedAgencyId = normalizedSlug
      ? (agencies.find(a => a.slug?.toLowerCase() === normalizedSlug)?.id ?? null)
      : null;

    onSaveUser({
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      agence: normalizedAgence || '',
      agency_id: resolvedAgencyId,
      role_agence: formData.roleAgence,
      global_role: formData.globalRole,
      apogee_user_id: formData.apogeeUserId ?? null,
    });
  };

  const handleResetPassword = () => {
    if (!onResetPassword || !newPassword) return;

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
      if (!hasSymbol) missing.push('un symbole');
      toast.error(`Il manque : ${missing.join(', ')}`);
      return;
    }

    onResetPassword(newPassword, sendEmail);
    setNewPassword('');
  };

  return (
    <ScrollArea className="flex-1 p-5">
      <div className="space-y-5">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <User className="h-4 w-4" />
          Informations
        </h3>

        {/* Status badges */}
        {mustChangePassword && (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 gap-1">
            <AlertCircle className="w-3 h-3" />
            Mot de passe provisoire
          </Badge>
        )}

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prénom</Label>
            {editMode ? (
              <Input
                value={formData.firstName}
                onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                className="rounded-lg"
              />
            ) : (
              <p className="font-medium">{firstName || '—'}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom</Label>
            {editMode ? (
              <Input
                value={formData.lastName}
                onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                className="rounded-lg"
              />
            ) : (
              <p className="font-medium">{lastName || '—'}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </Label>
          {editMode ? (
            <div className="flex gap-2">
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="flex-1 rounded-lg"
              />
              {onUpdateEmail && formData.email !== userEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateEmail(formData.email)}
                  disabled={isEmailPending}
                  className="rounded-lg"
                >
                  {isEmailPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Modifier'}
                </Button>
              )}
            </div>
          ) : (
            <p className="font-medium">{userEmail || '—'}</p>
          )}
        </div>

        {/* Agency */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Agence
          </Label>
          {editMode ? (
            <Select
              value={formData.agence || "none"}
              onValueChange={v => setFormData(p => ({ ...p, agence: v === "none" ? "" : v }))}
            >
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune agence</SelectItem>
                {agencies.filter(a => a.slug?.trim()).map(a => (
                  <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{agencyLabel || '—'}</p>
          )}
        </div>

        {/* Role agence */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> Poste
          </Label>
          {editMode ? (
            <Select
              value={formData.roleAgence || ""}
              onValueChange={v => {
                const suggested = getSuggestedGlobalRole(v);
                setFormData(p => ({
                  ...p,
                  roleAgence: v,
                  ...(suggested ? { globalRole: suggested } : {}),
                }));
              }}
            >
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_AGENCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{ROLE_AGENCE_LABELS[roleAgence || ''] || roleAgence || '—'}</p>
          )}
        </div>

        {/* Global role */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" /> Rôle système
          </Label>
          {editMode && assignableRoles.length > 0 ? (
            <Select
              value={formData.globalRole}
              onValueChange={v => setFormData(p => ({ ...p, globalRole: v as GlobalRole }))}
            >
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {assignableRoles.map(role => (
                  <SelectItem key={role} value={role}>{VISIBLE_ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge className={cn(getVisibleRoleColor(globalRole), "rounded-lg")}>
              {getVisibleRoleLabel(globalRole)}
            </Badge>
          )}
        </div>

        {/* Apogée link */}
        {editMode && formData.agence && (
          <ApogeeUserSelect
            value={formData.apogeeUserId}
            onChange={id => setFormData(p => ({ ...p, apogeeUserId: id }))}
            agencySlug={formData.agence}
            label="Liaison Apogée"
            collaboratorName={`${formData.firstName} ${formData.lastName}`}
          />
        )}

        {/* Password reset */}
        {editMode && onResetPassword && (
          <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <KeyRound className="h-3 w-3" /> Réinitialiser mot de passe
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="flex-1 rounded-lg"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNewPassword(generateSecurePassword())}
                className="rounded-lg shrink-0"
                title="Générer"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={!newPassword || isPasswordPending}
                className="rounded-lg"
              >
                {isPasswordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendPwdEmail"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="sendPwdEmail" className="text-xs">Envoyer par email</label>
            </div>
          </div>
        )}

        {/* Save button */}
        {editMode && onSaveUser && (
          <Button
            onClick={handleSaveUser}
            disabled={isSaving}
            className="w-full rounded-lg"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}
