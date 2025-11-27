import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserSystemRolesSection } from '@/components/admin/user/UserSystemRolesSection';
import { UserSupportConfigSection } from '@/components/admin/user/UserSupportConfigSection';
import { UserFranchiseurConfigSection } from '@/components/admin/user/UserFranchiseurConfigSection';
import { UserPermissionsSection } from '@/components/admin/user/UserPermissionsSection';
import { UserPasswordSection } from '@/components/admin/user/UserPasswordSection';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  service_competencies: any;
  created_at: string;
  system_roles?: string[];
  support_level?: number;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: 'dirigeant', label: 'Dirigeant(e)' },
  { value: 'assistante', label: 'Assistante' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'tete_de_reseau', label: 'Tête de réseau' },
  { value: 'externe', label: 'Externe' },
];

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Infos de base
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agence, setAgence] = useState('');
  const [roleAgence, setRoleAgence] = useState('');
  
  // Rôles système
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  
  // Support config
  const [supportLevel, setSupportLevel] = useState(1);
  const [serviceCompetencies, setServiceCompetencies] = useState<any>({});
  
  // Franchiseur config
  const [franchiseurRole, setFranchiseurRole] = useState('animateur');
  const [assignedAgencies, setAssignedAgencies] = useState<string[]>([]);

  useEffect(() => {
    if (user && open) {
      loadUserFullData();
    }
  }, [user, open]);

  const loadUserFullData = async () => {
    if (!user) return;

    // Infos de base depuis user prop
    setEmail(user.email || '');
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setAgence(user.agence || '');
    setRoleAgence(user.role_agence || '');
    setServiceCompetencies(user.service_competencies || {});
    setSupportLevel(user.support_level || 1);

    try {
      // Charger les rôles système
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = rolesData?.map(r => r.role) || [];
      setSystemRoles(roles);

      // Charger le rôle franchiseur
      const { data: frRole } = await supabase
        .from('franchiseur_roles')
        .select('franchiseur_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (frRole) {
        setFranchiseurRole(frRole.franchiseur_role);
      } else {
        setFranchiseurRole('animateur');
      }

      // Charger les assignations d'agences
      const { data: assignments } = await supabase
        .from('franchiseur_agency_assignments')
        .select('agency_id')
        .eq('user_id', user.id);

      setAssignedAgencies(assignments?.map(a => a.agency_id) || []);

      // Charger le niveau support
      const { data: profile } = await supabase
        .from('profiles')
        .select('support_level')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSupportLevel(profile.support_level || 1);
      }
    } catch (error) {
      console.error('Erreur chargement données complètes:', error);
    }
  };

  // Auto-cocher support et franchiseur si "tête de réseau"
  useEffect(() => {
    if (roleAgence === 'tete_de_reseau') {
      setSystemRoles(prev => {
        const newRoles = [...prev];
        if (!newRoles.includes('support')) newRoles.push('support');
        if (!newRoles.includes('franchiseur')) newRoles.push('franchiseur');
        return newRoles;
      });
    }
  }, [roleAgence]);

  const isTeteDeReseau = roleAgence === 'tete_de_reseau';
  const hasSupport = systemRoles.includes('support');
  const hasFranchiseur = systemRoles.includes('franchiseur');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const newEmail = email.trim();
      const emailChanged = newEmail !== user.email;

      // Si l'email a changé, synchroniser avec Supabase Auth
      if (emailChanged && newEmail) {
        const response = await supabase.functions.invoke('update-user-email', {
          body: { userId: user.id, newEmail }
        });
        if (response.error) throw response.error;
      }

      // 1. Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: newEmail || null,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          agence: agence.trim() || null,
          role_agence: roleAgence || null,
          service_competencies: serviceCompetencies,
          support_level: supportLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Synchroniser les rôles système
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      for (const role of systemRoles) {
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: role as 'admin' | 'support' | 'user' | 'franchiseur'
        });
      }

      // 3. Gérer le rôle franchiseur
      if (hasFranchiseur) {
        // Upsert franchiseur_roles
        const { data: existingFr } = await supabase
          .from('franchiseur_roles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingFr) {
          await supabase
            .from('franchiseur_roles')
            .update({ franchiseur_role: franchiseurRole as 'animateur' | 'directeur' | 'dg' })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('franchiseur_roles')
            .insert({
              user_id: user.id,
              franchiseur_role: franchiseurRole as 'animateur' | 'directeur' | 'dg'
            });
        }

        // 4. Gérer les assignations d'agences (seulement pour animateur)
        if (franchiseurRole === 'animateur') {
          await supabase
            .from('franchiseur_agency_assignments')
            .delete()
            .eq('user_id', user.id);

          for (const agencyId of assignedAgencies) {
            await supabase
              .from('franchiseur_agency_assignments')
              .insert({ user_id: user.id, agency_id: agencyId });
          }
        }
      } else {
        // Supprimer les données franchiseur si le rôle est retiré
        await supabase.from('franchiseur_roles').delete().eq('user_id', user.id);
        await supabase.from('franchiseur_agency_assignments').delete().eq('user_id', user.id);
      }

      // Auto-créer l'agence si elle n'existe pas
      if (agence.trim() && agence.trim() !== user.agence) {
        const agencySlug = agence.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        const { data: existingAgency } = await supabase
          .from('apogee_agencies')
          .select('id')
          .eq('slug', agencySlug)
          .maybeSingle();

        if (!existingAgency) {
          await supabase
            .from('apogee_agencies')
            .insert({ slug: agencySlug, label: agence.trim(), is_active: true });
        }
      }

      toast({
        title: 'Utilisateur modifié',
        description: 'Les informations ont été mises à jour avec succès',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur modification utilisateur:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier l\'utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Configuration complète de l'utilisateur
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section A - Informations de base */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium text-sm text-muted-foreground">Informations de base</h3>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utilisateur@exemple.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Prénom</Label>
                <Input
                  id="edit-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Nom</Label>
                <Input
                  id="edit-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-agence">Agence</Label>
              <Input
                id="edit-agence"
                value={agence}
                onChange={(e) => setAgence(e.target.value)}
                placeholder="Nom de l'agence"
              />
            </div>

            <div className="space-y-2">
              <Label>Poste occupé</Label>
              <RadioGroup value={roleAgence} onValueChange={setRoleAgence} className="flex flex-wrap gap-4">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={role.value} id={`edit-role-${role.value}`} />
                    <Label htmlFor={`edit-role-${role.value}`} className="cursor-pointer font-normal">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          {/* Section B - Rôles système */}
          <UserSystemRolesSection
            systemRoles={systemRoles}
            onRolesChange={setSystemRoles}
            isTeteDeReseau={isTeteDeReseau}
          />

          {/* Section C - Configuration Support (si support coché) */}
          {hasSupport && (
            <UserSupportConfigSection
              supportLevel={supportLevel}
              onSupportLevelChange={setSupportLevel}
              serviceCompetencies={serviceCompetencies}
              onServiceCompetenciesChange={setServiceCompetencies}
            />
          )}

          {/* Section D - Configuration Franchiseur (si franchiseur coché) */}
          {hasFranchiseur && (
            <UserFranchiseurConfigSection
              franchiseurRole={franchiseurRole}
              onFranchiseurRoleChange={setFranchiseurRole}
              assignedAgencies={assignedAgencies}
              onAssignedAgenciesChange={setAssignedAgencies}
            />
          )}

          {/* Section E - Permissions individuelles */}
          {user && (
            <UserPermissionsSection
              userId={user.id}
              userRole={roleAgence}
            />
          )}

          {/* Section F - Mot de passe */}
          {user && (
            <UserPasswordSection userId={user.id} />
          )}

          {/* Boutons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
