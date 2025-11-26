import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { z } from 'zod';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  created_at: string;
}

const createUserSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "L'adresse email n'est pas valide" }),
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
    .optional()
    .refine((val) => !val || ['dirigeant', 'assistant(e)', 'technicien', 'commercial'].includes(val), {
      message: "Veuillez sélectionner un rôle valide"
    }),
  password: z.string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .max(100, { message: "Le mot de passe ne peut pas dépasser 100 caractères" })
});

const getRoleLabel = (roleValue: string | null): string => {
  if (!roleValue) return '-';
  const roles: Record<string, string> = {
    'dirigeant': 'Dirigeant(e)',
    'assistant(e)': 'Assistant(e)',
    'technicien': 'Technicien',
    'commercial': 'Commercial',
  };
  return roles[roleValue] || roleValue;
};

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agence, setAgence] = useState('');
  const [roleAgence, setRoleAgence] = useState('');
  const [tempPassword, setTempPassword] = useState('');

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
      email: email.trim(),
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
      // Vérifier la session avant d'appeler la fonction
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: 'Session expirée',
          description: 'Votre session a expiré. Veuillez vous reconnecter.',
          variant: 'destructive',
        });
        setLoading(false);
        // Redirection vers la page de connexion après un court délai
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      // Appel de la fonction edge (le SDK Supabase envoie automatiquement le token)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { 
          email: email.trim(),
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
        description: `L'utilisateur "${email}" a été créé avec succès. Un email contenant son mot de passe temporaire lui a été transmis.`,
      });

      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setAgence('');
      setRoleAgence('');
      setTempPassword('');
      setErrors({});
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

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Créer un utilisateur</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Nouvel utilisateur
          </CardTitle>
          <CardDescription>
            Créez un compte avec un mot de passe provisoire. L'utilisateur devra le changer à sa première connexion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  placeholder="jean.dupont@exemple.com"
                  required
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

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
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
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
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
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
                {errors.agence && <p className="text-xs text-destructive">{errors.agence}</p>}
              </div>

              <div className="space-y-2">
                <Label>Rôle</Label>
                <RadioGroup value={roleAgence} onValueChange={setRoleAgence} className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dirigeant" id="role-dirigeant" />
                    <Label htmlFor="role-dirigeant" className="cursor-pointer font-normal text-sm">
                      Dirigeant(e)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="assistant(e)" id="role-assistant" />
                    <Label htmlFor="role-assistant" className="cursor-pointer font-normal text-sm">
                      Assistant(e)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="technicien" id="role-technicien" />
                    <Label htmlFor="role-technicien" className="cursor-pointer font-normal text-sm">
                      Technicien
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="commercial" id="role-commercial" />
                    <Label htmlFor="role-commercial" className="cursor-pointer font-normal text-sm">
                      Commercial
                    </Label>
                  </div>
                </RadioGroup>
                {errors.roleAgence && <p className="text-xs text-destructive">{errors.roleAgence}</p>}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="password">Mot de passe provisoire *</Label>
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
                    placeholder="Min. 8 caractères"
                    required
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Générer
                </Button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              <Alert className="py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  Communiquez ces identifiants à l'utilisateur. Il devra changer son mot de passe à la première connexion.
                </AlertDescription>
              </Alert>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
