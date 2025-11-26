import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  service_competencies: any;
  created_at: string;
  system_role?: string;
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
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agence, setAgence] = useState('');
  const [roleAgence, setRoleAgence] = useState('');
  const [serviceCompetencies, setServiceCompetencies] = useState<any>({});
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [sendPasswordEmail, setSendPasswordEmail] = useState(true);
  const [systemRole, setSystemRole] = useState<string>('user');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setAgence(user.agence || '');
      setRoleAgence(user.role_agence || '');
      setServiceCompetencies(user.service_competencies || {});
      setSystemRole(user.system_role || 'user');
    }
  }, [user]);

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = async () => {
    if (!user) return;

    setGeneratingPassword(true);
    try {
      const newPassword = generateRandomPassword();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('reset-user-password', {
        body: { 
          userId: user.id, 
          newPassword,
          sendEmail: sendPasswordEmail
        }
      });

      if (response.error) throw response.error;

      setGeneratedPassword(newPassword);
      
      toast({
        title: 'Mot de passe généré',
        description: sendPasswordEmail
          ? 'Le mot de passe temporaire a été créé et envoyé par email. L\'utilisateur devra le changer à la prochaine connexion.'
          : 'Le mot de passe temporaire a été créé. L\'utilisateur devra le changer à la prochaine connexion.',
      });
    } catch (error: any) {
      console.error('Erreur génération mot de passe:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le mot de passe',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPassword(false);
    }
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: 'Copié',
      description: 'Le mot de passe a été copié dans le presse-papiers',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const newEmail = email.trim();
      const emailChanged = newEmail !== user.email;

      // Si l'email a changé, synchroniser avec Supabase Auth
      if (emailChanged && newEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Non authentifié');

        const response = await supabase.functions.invoke('update-user-email', {
          body: { userId: user.id, newEmail }
        });

        if (response.error) throw response.error;
      }

      // Mettre à jour les autres informations du profil
      const { error } = await supabase
        .from('profiles')
        .update({
          email: newEmail || null,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          agence: agence.trim() || null,
          role_agence: roleAgence || null,
          service_competencies: serviceCompetencies,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Auto-créer l'agence si elle n'existe pas déjà
      if (agence.trim() && agence.trim() !== user.agence) {
        const agencySlug = agence.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        const { data: existingAgency } = await supabase
          .from('apogee_agencies')
          .select('id')
          .eq('slug', agencySlug)
          .maybeSingle();

        if (!existingAgency) {
          const { error: agencyError } = await supabase
            .from('apogee_agencies')
            .insert({
              slug: agencySlug,
              label: agence.trim(),
              is_active: true
            });

          if (agencyError) {
            console.error('Erreur création agence:', agencyError);
            // On continue même si la création d'agence échoue
          } else {
            console.log('Agence créée automatiquement:', agencySlug);
          }
        }
      }

      // Règle automatique : si le poste devient "tete_de_reseau", attribuer le rôle système "franchiseur"
      if (roleAgence === 'tete_de_reseau' && roleAgence !== user.role_agence) {
        console.log('Changement vers tête de réseau détecté pour utilisateur:', user.id);
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // Attribuer "franchiseur" si l'utilisateur n'a pas déjà un rôle ou si son rôle est "user"
        if (!existingRole || existingRole.role === 'user') {
          console.log('Attribution automatique du rôle franchiseur');
          await supabase.from('user_roles').upsert({
            user_id: user.id,
            role: 'franchiseur'
          });
        } else {
          console.log('Rôle existant conservé:', existingRole.role);
        }
      }

      toast({
        title: 'Utilisateur modifié',
        description: emailChanged 
          ? 'Les informations et l\'email d\'authentification ont été mis à jour avec succès'
          : 'Les informations ont été mises à jour avec succès',
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'utilisateur
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-3">
            <Label>Poste occupé</Label>
            <RadioGroup value={roleAgence} onValueChange={setRoleAgence}>
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

          {systemRole !== 'user' && (
            <Card className="border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Compétences services</CardTitle>
                <CardDescription className="text-xs">
                  Sélectionnez les services sur lesquels cet utilisateur peut intervenir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Services généraux</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={serviceCompetencies.apogee ? "default" : "outline"}
                      onClick={() => {
                        const newCompetencies = { ...serviceCompetencies };
                        if (newCompetencies.apogee) {
                          delete newCompetencies.apogee;
                        } else {
                          newCompetencies.apogee = true;
                        }
                        setServiceCompetencies(newCompetencies);
                      }}
                    >
                      Apogée
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={serviceCompetencies.apporteurs ? "default" : "outline"}
                      onClick={() => {
                        const newCompetencies = { ...serviceCompetencies };
                        if (newCompetencies.apporteurs) {
                          delete newCompetencies.apporteurs;
                        } else {
                          newCompetencies.apporteurs = true;
                        }
                        setServiceCompetencies(newCompetencies);
                      }}
                    >
                      Apporteurs
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={serviceCompetencies.conseil ? "default" : "outline"}
                      onClick={() => {
                        const newCompetencies = { ...serviceCompetencies };
                        if (newCompetencies.conseil) {
                          delete newCompetencies.conseil;
                        } else {
                          newCompetencies.conseil = true;
                        }
                        setServiceCompetencies(newCompetencies);
                      }}
                    >
                      Conseil
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground" htmlFor="helpconfort-role">
                    HelpConfort
                  </Label>
                  <Select
                    value={serviceCompetencies.helpconfort || 'none'}
                    onValueChange={(value) => {
                      const newCompetencies = { ...serviceCompetencies };
                      if (value === 'none') {
                        delete newCompetencies.helpconfort;
                      } else {
                        newCompetencies.helpconfort = value;
                      }
                      setServiceCompetencies(newCompetencies);
                    }}
                  >
                    <SelectTrigger id="helpconfort-role">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="animateur_reseau">Animateur Réseau</SelectItem>
                      <SelectItem value="directeur_reseau">Directeur Réseau</SelectItem>
                      <SelectItem value="dg">Directeur Général</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Réinitialisation mot de passe</CardTitle>
              <CardDescription className="text-xs">
                Génère un mot de passe temporaire et force le changement à la prochaine connexion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="sendPasswordEmail"
                  checked={sendPasswordEmail}
                  onCheckedChange={(checked) => setSendPasswordEmail(checked as boolean)}
                />
                <Label
                  htmlFor="sendPasswordEmail"
                  className="text-xs font-normal cursor-pointer"
                >
                  Envoyer le mot de passe par email
                </Label>
              </div>
              
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={generatingPassword}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generatingPassword ? 'animate-spin' : ''}`} />
                {generatingPassword ? 'Génération...' : 'Générer mot de passe'}
              </Button>
              
              {generatedPassword && (
                <div className="space-y-2">
                  <Label className="text-xs">Mot de passe généré :</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedPassword}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyPasswordToClipboard}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Communiquez ce mot de passe à l'utilisateur. Il devra le changer à la connexion.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
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
