/**
 * Dialog unifié utilisateur - Informations + Permissions
 * Design moderne à deux colonnes avec bords arrondis
 * 
 * Refactored: sub-components extracted to user-full-dialog/
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Lock, LockOpen, User } from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { UserInfoColumn } from './user-full-dialog/UserInfoColumn';
import { UserPermissionsColumn } from './user-full-dialog/UserPermissionsColumn';
import { UserFullDialogProps, UserFormData } from './user-full-dialog/constants';

// Re-export props type for external consumers
export type { UserFullDialogProps } from './user-full-dialog/constants';

export function UserFullDialog({
  userId,
  userName,
  userEmail,
  firstName,
  lastName,
  globalRole,
  agencyId,
  agencySlug,
  agencyLabel,
  roleAgence,
  isActive = true,
  mustChangePassword = false,
  apogeeUserId,
  enabledModules,
  planKey,
  planLabel,
  canEdit = false,
  pageOverrides = [],
  agencies = [],
  assignableRoles = [],
  onPlanChange,
  onModuleToggle,
  onPageOverrideToggle,
  onSaveUser,
  onUpdateEmail,
  onResetPassword,
  isSaving = false,
  isEmailPending = false,
  isPasswordPending = false,
}: UserFullDialogProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    agence: '',
    roleAgence: '',
    poste: '',
    globalRole: 'base_user' as GlobalRole,
    apogeeUserId: undefined,
  });

  // Sync form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        firstName: firstName || '',
        lastName: lastName || '',
        email: userEmail || '',
        agence: agencySlug || '',
        roleAgence: roleAgence || '',
        poste: '',
        globalRole: globalRole || 'base_user',
        apogeeUserId: apogeeUserId ?? undefined,
      });
    }
  }, [open, firstName, lastName, userEmail, agencySlug, roleAgence, globalRole, apogeeUserId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir / Modifier">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 pr-14 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">{userName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isActive && (
                <Badge variant="destructive" className="gap-1">Inactif</Badge>
              )}
              {canEdit && (
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="gap-1.5 rounded-lg"
                >
                  {editMode ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {editMode ? 'Verrouiller' : 'Éditer'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content - Two columns */}
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x max-h-[calc(90vh-120px)]">
          <UserInfoColumn
            editMode={editMode}
            formData={formData}
            setFormData={setFormData}
            firstName={firstName}
            lastName={lastName}
            userEmail={userEmail}
            agencyLabel={agencyLabel}
            roleAgence={roleAgence}
            globalRole={globalRole}
            mustChangePassword={mustChangePassword}
            agencies={agencies}
            assignableRoles={assignableRoles}
            onSaveUser={onSaveUser}
            onUpdateEmail={onUpdateEmail}
            onResetPassword={onResetPassword}
            isSaving={isSaving}
            isEmailPending={isEmailPending}
            isPasswordPending={isPasswordPending}
          />

          <UserPermissionsColumn
            editMode={editMode}
            globalRole={globalRole}
            enabledModules={enabledModules}
            planKey={planKey}
            planLabel={planLabel}
            agencyId={agencyId}
            pageOverrides={pageOverrides}
            onPlanChange={onPlanChange}
            onModuleToggle={onModuleToggle}
            onPageOverrideToggle={onPageOverrideToggle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
