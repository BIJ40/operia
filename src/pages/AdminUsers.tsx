import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, UserPlus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { z } from 'zod';

interface UserProfile {
  id: string;
  pseudo: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  created_at: string;
}

const createUserSchema = z.object({
  pseudo: z.string()
    .trim()
    .min(3, { message: "Le pseudo doit contenir au moins 3 caractères" })
    .max(30, { message: "Le pseudo ne peut pas dépasser 30 caractères" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores" }),
  firstName: z.string()
    .trim()
    .min(1, { message: "Le prénom est requis" })
    .max(50, { message: "Le prénom ne peut pas dépasser 50 caractères" }),
  lastName: z.string()
    .trim()
    .min(1, { message: "Le nom est requis" })
    .max(50, { message: "Le nom ne peut pas dépasser 50 caractères" }),
  agence: z.string()
    .trim()
    .max(100, { message: "L'agence ne peut pas dépasser 100 caractères" })
    .optional(),
  roleAgence: z.string()
    .trim()
    .max(100, { message: "Le rôle ne peut pas dépasser 100 caractères" })
    .optional(),
  password: z.string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .max(100, { message: "Le mot de passe ne peut pas dépasser 100 caractères" })
});

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form fields
  const [pseudo, setPseudo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agence, setAgence] = useState('');
  const [roleAgence, setRoleAgence] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(password);
    setErrors(prev => ({ ...prev, password: '' }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validation avec Zod
    const validation = createUserSchema.safeParse({
      pseudo: pseudo.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      agence: agence.trim() || undefined,
      roleAgence: roleAgence.trim() || undefined,
      password: tempPassword
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(newErrors);
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez corriger les erreurs dans le formulaire',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { 
          pseudo: pseudo.trim(),
          password: tempPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          agence: agence.trim() || null,
          roleAgence: roleAgence.trim() || null
        }
      });

      if (error) throw error;

      toast({
        title: 'Utilisateur créé !',
        description: `L'utilisateur "${pseudo}" a été créé avec succès. Communiquez-lui ses identifiants : Pseudo = ${pseudo}, Mot de passe = ${tempPassword}`,
      });

      // Reset form
      setPseudo('');
      setFirstName('');
      setLastName('');
      setAgence('');
      setRoleAgence('');
      setTempPassword('');
      setErrors({});
      
      // Reload users
      loadUsers();
    } catch (error: any) {
      console.error('Erreur création utilisateur:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: 'Utilisateur supprimé',
        description: 'L\'utilisateur a été supprimé avec succès',
      });

      loadUsers();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'utilisateur',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Accès refusé. Cette page est réservée aux administrateurs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>

      {/* Création d'utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un nouvel utilisateur
          </CardTitle>
          <CardDescription>
            Créez un compte utilisateur avec un mot de passe provisoire. L'utilisateur devra le changer à sa première connexion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pseudo">Pseudo * <span className="text-xs text-muted-foreground">(3-30 caractères, lettres, chiffres, - et _)</span></Label>
              <Input
                id="pseudo"
                value={pseudo}
                onChange={(e) => {
                  setPseudo(e.target.value);
                  setErrors(prev => ({ ...prev, pseudo: '' }));
                }}
                placeholder="jean_dupont"
                required
                className={errors.pseudo ? 'border-destructive' : ''}
              />
              {errors.pseudo && <p className="text-sm text-destructive">{errors.pseudo}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  placeholder="Jean"
                  required
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  placeholder="Dupont"
                  required
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agence">Agence</Label>
              <Input
                id="agence"
                value={agence}
                onChange={(e) => {
                  setAgence(e.target.value);
                  setErrors(prev => ({ ...prev, agence: '' }));
                }}
                placeholder="Nom de l'agence"
                className={errors.agence ? 'border-destructive' : ''}
              />
              {errors.agence && <p className="text-sm text-destructive">{errors.agence}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleAgence">Rôle dans l'agence</Label>
              <Input
                id="roleAgence"
                value={roleAgence}
                onChange={(e) => {
                  setRoleAgence(e.target.value);
                  setErrors(prev => ({ ...prev, roleAgence: '' }));
                }}
                placeholder="Ex: Conseiller, Manager, etc."
                className={errors.roleAgence ? 'border-destructive' : ''}
              />
              {errors.roleAgence && <p className="text-sm text-destructive">{errors.roleAgence}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe provisoire * <span className="text-xs text-muted-foreground">(min. 8 caractères)</span></Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={tempPassword}
                    onChange={(e) => {
                      setTempPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder="Mot de passe provisoire"
                    required
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Générer
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              <p className="text-sm text-muted-foreground">
                Ce mot de passe sera communiqué à l'utilisateur. Il devra le changer à sa première connexion.
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Si l'utilisateur perd son mot de passe, il doit vous contacter pour réinitialisation.
                </AlertDescription>
              </Alert>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pseudo</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.pseudo || '-'}</TableCell>
                  <TableCell>{user.last_name || '-'}</TableCell>
                  <TableCell>{user.first_name || '-'}</TableCell>
                  <TableCell>{user.agence || '-'}</TableCell>
                  <TableCell>{user.role_agence || '-'}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucun utilisateur enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
