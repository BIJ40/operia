import { useState, useEffect } from 'react';
import { GlobalRole, GLOBAL_ROLE_LABELS, getAllRolesSorted, getRoleLevel, GLOBAL_ROLES } from '@/types/globalRoles';
import { UserProfile } from '@/hooks/use-admin-users-unified';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Pencil, Save, UserX, UserCheck, Trash2, KeyRound, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { generateSecurePassword } from '@/lib/passwordUtils';

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'technicien': 'Technicien',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { email: string; password: string; firstName: string; lastName: string; agence: string; globalRole: GlobalRole; sendEmail: boolean }) => void;
  isPending: boolean;
  assignableRoles: GlobalRole[];
  agencies: Agency[];
  currentUserLevel: number;
  currentUserAgency: string | null;
}

export function CreateUserDialog({ open, onOpenChange, onSubmit, isPending, assignableRoles, agencies, currentUserLevel, currentUserAgency }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    agence: '',
    globalRole: 'franchisee_user' as GlobalRole,
    sendEmail: true,
  });

  const handleGeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generateSecurePassword() }));
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      agence: currentUserLevel === GLOBAL_ROLES.franchisee_admin ? (currentUserAgency || '') : formData.agence,
    });
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', firstName: '', lastName: '', agence: '', globalRole: 'franchisee_user', sendEmail: true });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
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
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe provisoire *</Label>
            <div className="flex gap-2">
              <Input type="text" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Générer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">18 caractères avec majuscules, minuscules, chiffres et symboles</p>
          </div>
          {currentUserLevel !== GLOBAL_ROLES.franchisee_admin && (
            <div className="space-y-2">
              <Label>Agence</Label>
              <Select value={formData.agence || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">Aucune agence</SelectItem>
                  {agencies.filter(a => a.slug && a.slug.trim() !== "").map(a => <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Rôle système</Label>
            <Select value={formData.globalRole} onValueChange={(v) => setFormData(prev => ({ ...prev, globalRole: v as GlobalRole }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                {assignableRoles.map(role => (
                  <SelectItem key={role} value={role}>{GLOBAL_ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="sendEmail" 
              checked={formData.sendEmail}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendEmail: checked === true }))}
            />
            <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
              Envoyer l'email de bienvenue avec mot de passe provisoire
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!formData.email || !formData.password || !formData.firstName || !formData.lastName || isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Créer
          </Button>
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
  onSave: (data: { first_name?: string; last_name?: string; agence?: string; role_agence?: string; support_level?: number; global_role?: GlobalRole }) => void;
  onUpdateEmail: (newEmail: string) => void;
  onResetPassword: (newPassword: string) => void;
  isPending: boolean;
  isEmailPending: boolean;
  isPasswordPending: boolean;
  agencies?: Agency[];
  canEditRoleAgence?: boolean;
  assignableRoles?: GlobalRole[];
}

export function EditUserDialog({ user, open, onOpenChange, onSave, onUpdateEmail, onResetPassword, isPending, isEmailPending, isPasswordPending, agencies = [], canEditRoleAgence = false, assignableRoles = [] }: EditUserDialogProps) {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', agence: '', roleAgence: '', supportLevel: 1, globalRole: 'base_user' as GlobalRole });
  const [newPassword, setNewPassword] = useState('');

  // Synchroniser formData avec les données de l'utilisateur à l'ouverture
  useEffect(() => {
    if (open && user) {
      const modules = user.enabled_modules as any;
      const supportLevel = modules?.support?.options?.level || 1;
      
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        agence: user.agence || '',
        roleAgence: user.role_agence || '',
        supportLevel,
        globalRole: user.global_role || 'base_user',
      });
    }
  }, [open, user]);
  
  // Vérifier si le module support est activé
  const isSupportModuleEnabled = () => {
    if (!user?.enabled_modules) return false;
    const modules = user.enabled_modules as any;
    return modules?.support?.enabled === true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Modifier l'utilisateur
          </DialogTitle>
          <DialogDescription>Modifier les informations de {user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2 flex-wrap">
            {user?.must_change_password && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                <AlertCircle className="w-3 h-3 mr-1" />
                Mot de passe provisoire non changé
              </Badge>
            )}
            {user?.is_active === false && (
              <Badge variant="destructive"><UserX className="w-3 h-3 mr-1" />Compte désactivé</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => onUpdateEmail(formData.email)} disabled={formData.email === user?.email || isEmailPending}>
                <Mail className="w-4 h-4 mr-1" />Modifier email
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Agence</Label>
            <Select value={formData.agence || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="none">Aucune agence</SelectItem>
                {agencies.filter(a => a.slug && a.slug.trim() !== "").map((agency) => (
                  <SelectItem key={agency.id} value={agency.slug}>
                    {agency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Poste occupé</Label>
            <Select value={formData.roleAgence} onValueChange={(v) => setFormData(prev => ({ ...prev, roleAgence: v }))} disabled={!canEditRoleAgence}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un poste" /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                {Object.entries(ROLE_AGENCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canEditRoleAgence && (
              <p className="text-xs text-muted-foreground">Seul Admin et N+1 peuvent modifier ce champ</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Rôle global (plafond)</Label>
            <Select value={formData.globalRole} onValueChange={(v) => setFormData(prev => ({ ...prev, globalRole: v as GlobalRole }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                {assignableRoles.map(role => (
                  <SelectItem key={role} value={role}>{GLOBAL_ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Définit le niveau d'autorité maximum de l'utilisateur</p>
          </div>
          {isSupportModuleEnabled() && (
            <div className="space-y-2">
              <Label>Niveau Support (SA)</Label>
              <Select value={formData.supportLevel.toString()} onValueChange={(v) => setFormData(prev => ({ ...prev, supportLevel: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="1">SA1 - Support de base</SelectItem>
                  <SelectItem value="2">SA2 - Support technique</SelectItem>
                  <SelectItem value="3">SA3 - Support expert</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Définit le niveau pour les escalades de tickets support</p>
            </div>
          )}
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <Label className="flex items-center gap-2"><KeyRound className="w-4 h-4" />Réinitialiser le mot de passe</Label>
            <div className="flex gap-2">
              <Input type="text" placeholder="Nouveau mot de passe (min 8 car.)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={() => { onResetPassword(newPassword); setNewPassword(''); }} disabled={!newPassword || isPasswordPending}>
                {isPasswordPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSave({ 
            first_name: formData.firstName, 
            last_name: formData.lastName, 
            agence: formData.agence, 
            role_agence: formData.roleAgence,
            global_role: formData.globalRole,
            support_level: isSupportModuleEnabled() ? formData.supportLevel : undefined
          })} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
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
