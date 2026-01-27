import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Loader2, LogIn } from 'lucide-react';
import operiaLogo from '@/assets/operia-logo.png';

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "L'adresse email n'est pas valide" }),
  password: z.string()
    .min(1, { message: "Le mot de passe est requis" })
});

export function LoginFormCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const validation = loginSchema.safeParse({
      email: email.trim(),
      password
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error('[LoginFormCard] Auth error:', signInError.message, signInError.status, signInError);
        
        let errorMessage = 'Email ou mot de passe incorrect';
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email';
        } else if (signInError.message.includes('Too many requests')) {
          errorMessage = 'Trop de tentatives. Réessayez dans quelques minutes.';
        } else if (signInError.message.includes('Network')) {
          errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
        } else {
          errorMessage = `Erreur: ${signInError.message}`;
        }
        
        throw new Error(errorMessage);
      }

      // Success - auth state change will handle redirect
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-border/50">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={operiaLogo} alt="OPER.IA" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            OPER.IA
          </span>
        </div>
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>
          Connectez-vous avec votre email et votre mot de passe.
          <br />
          <span className="text-xs text-muted-foreground">
            Si vous avez perdu votre mot de passe, contactez votre administrateur.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors(prev => ({ ...prev, email: '' }));
              }}
              placeholder="votre.email@exemple.com"
              required
              className={errors.email ? 'border-destructive' : ''}
              autoComplete="email"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: '' }));
              }}
              placeholder="••••••••"
              required
              className={errors.password ? 'border-destructive' : ''}
              autoComplete="current-password"
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Se connecter
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
