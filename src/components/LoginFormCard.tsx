import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { RegistrationRequestDialog } from '@/components/registration/RegistrationRequestDialog';

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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast({ title: 'Email invalide', description: "Veuillez saisir une adresse email valide.", variant: 'destructive' });
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible d'envoyer l'email.";
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setForgotLoading(false);
    }
  };

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

  if (forgotMode) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            {forgotSent
              ? "Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception (et vos spams)."
              : "Saisissez votre adresse email pour recevoir un lien de réinitialisation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forgotSent ? (
            <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
              Retour à la connexion
            </Button>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={forgotLoading} className="w-full gap-2">
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  'Envoyer le lien de réinitialisation'
                )}
              </Button>
              <Button variant="ghost" type="button" className="w-full text-sm" onClick={() => setForgotMode(false)}>
                Retour à la connexion
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-border/50">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>
          Connectez-vous avec votre email et votre mot de passe.
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setForgotMode(true); setForgotEmail(email); }}
              >
                Mot de passe oublié ?
              </button>
            </div>
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
        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
            onClick={() => setRegistrationOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Pas encore inscrit ?
          </button>
        </div>
        <RegistrationRequestDialog open={registrationOpen} onOpenChange={setRegistrationOpen} />
      </CardContent>
    </Card>
  );
}
