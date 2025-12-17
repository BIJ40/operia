import { GlobalRole } from '@/types/globalRoles';
import { UserProfile } from '@/hooks/use-user-management';
import { ModuleKey, EnabledModules } from '@/types/modules';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, Pencil, UserX, UserCheck, Trash2, User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserCreateForm, CreateUserPayload } from '@/components/users/UserCreateForm';
import { UserEditForm, UpdateUserPayload } from '@/components/users/UserEditForm';
import { UserModulesTab } from '@/components/users/UserModulesTab';
import { TooltipProvider } from '@/components/ui/tooltip';

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { email: string; password: string; firstName: string; lastName: string; agence: string; roleAgence: string; globalRole: GlobalRole; sendEmail: boolean }) => void;
  isPending: boolean;
  assignableRoles: GlobalRole[];
  agencies: Agency[];
  currentUserLevel: number;
  currentUserAgency: string | null;
  /** Si true, force l'agence courante sans possibilité de choisir (mode agence) */
  forceOwnAgency?: boolean;
  /** Si true, restreint les postes à ceux valides pour une agence (exclut tete_de_reseau, externe) */
  agencyMode?: boolean;
}

export function CreateUserDialog({ open, onOpenChange, onSubmit, isPending, assignableRoles, agencies, currentUserLevel, currentUserAgency, forceOwnAgency = false, agencyMode = false }: CreateUserDialogProps) {
  const handleSubmit = (payload: CreateUserPayload) => {
    // Si forceOwnAgency ou N2, forcer l'agence courante
    const shouldForceAgency = forceOwnAgency || currentUserLevel === 2;
    const finalAgence = shouldForceAgency ? (currentUserAgency || '') : payload.agence;
    
    onSubmit({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      agence: finalAgence,
      roleAgence: payload.roleAgence,
      globalRole: payload.globalRole as GlobalRole,
      sendEmail: payload.sendEmail,
    });
  };

  // Masquer le sélecteur d'agence si forceOwnAgency ou N2
  const showAgencySelector = !forceOwnAgency && currentUserLevel !== 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un utilisateur
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouvel utilisateur.
          </DialogDescription>
        </DialogHeader>
        
        <UserCreateForm
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          availableAgencies={agencies}
          assignableRoles={assignableRoles}
          showAgencySelector={showAgencySelector}
          defaultAgency={undefined}
          creatorRoleLevel={currentUserLevel}
          agencyMode={agencyMode}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface EditUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: UpdateUserPayload) => void;
  onUpdateEmail: (newEmail: string) => void;
  onResetPassword: (newPassword: string, sendEmail?: boolean) => void;
  isPending: boolean;
  isEmailPending: boolean;
  isPasswordPending: boolean;
  agencies?: Agency[];
  canEditRoleAgence?: boolean;
  assignableRoles?: GlobalRole[];
  readOnlyFields?: string[]; // 🛡️ P1: Liste des champs en lecture seule
  // Modules management
  onModuleToggle?: (moduleKey: ModuleKey, enabled: boolean) => void;
  onModuleOptionToggle?: (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => void;
  canEdit?: boolean;
}

export function EditUserDialog({ 
  user, 
  open, 
  onOpenChange, 
  onSave, 
  onUpdateEmail, 
  onResetPassword, 
  isPending, 
  isEmailPending, 
  isPasswordPending, 
  agencies = [], 
  canEditRoleAgence = false, 
  assignableRoles = [], 
  readOnlyFields = [],
  onModuleToggle,
  onModuleOptionToggle,
  canEdit = true,
}: EditUserDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Modifier l'utilisateur
          </DialogTitle>
          <DialogDescription>Modifier les informations de {user.email}</DialogDescription>
        </DialogHeader>
        
        <TooltipProvider>
          <Tabs defaultValue="infos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="infos" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Modules
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="infos" className="mt-4">
              <UserEditForm
                user={user}
                onSave={onSave}
                onUpdateEmail={onUpdateEmail}
                onResetPassword={onResetPassword}
                isSubmitting={isPending}
                isEmailPending={isEmailPending}
                isPasswordPending={isPasswordPending}
                availableAgencies={agencies}
                assignableRoles={assignableRoles}
                canEditRoleAgence={canEditRoleAgence}
                readOnlyFields={readOnlyFields}
              />
            </TabsContent>
            
            <TabsContent value="modules" className="mt-4">
              {onModuleToggle && onModuleOptionToggle ? (
                <UserModulesTab
                  enabledModules={user.enabled_modules as EnabledModules | null}
                  userRole={user.global_role}
                  canEdit={canEdit}
                  onModuleToggle={onModuleToggle}
                  onModuleOptionToggle={onModuleOptionToggle}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  La gestion des modules n'est pas disponible dans ce contexte.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  user: UserProfile | null;
}

export function DeactivateDialog({ open, onOpenChange, onConfirm, isPending, user }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Désactiver l'utilisateur ?</AlertDialogTitle>
          <AlertDialogDescription>
            L'utilisateur <strong>{user?.email}</strong> ne pourra plus se connecter, mais ses données resteront dans les historiques.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-orange-600 hover:bg-orange-700">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserX className="w-4 h-4 mr-2" />}
            Désactiver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReactivateDialog({ open, onOpenChange, onConfirm, isPending, user }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réactiver l'utilisateur ?</AlertDialogTitle>
          <AlertDialogDescription>
            L'utilisateur <strong>{user?.email}</strong> pourra à nouveau se connecter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
            Réactiver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteDialog({ open, onOpenChange, onConfirm, isPending, user }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Supprimer définitivement ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-destructive">ATTENTION :</strong> Cette action est irréversible.
            Toutes les données de l'utilisateur <strong>{user?.email}</strong> seront définitivement supprimées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
