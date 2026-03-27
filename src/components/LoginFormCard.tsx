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
  identifier: z.string()
    .trim()
    .min(1, { message: "Identifiant requis" }),
  password: z.string()
    .min(1, { message: "Le mot de passe est requis" })
});

/** Si l'identifiant est un pseudo (pas un email), on le convertit en email interne */
function resolveEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) return trimmed;
  // Pseudo → email interne
  return `${trimmed}@internal.helpconfort.services`;
}

export function LoginFormCard() {
  const [identifier, setIdentifier] = useState('');
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

    const validation = loginSchema.safeParse({ identifier: identifier.trim(), password });

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
      const email = resolveEmail(identifier);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('[LoginFormCard] Auth error:', signInError.message, signInError.status, signInError);
        
        let errorMessage = 'Identifiant ou mot de passe incorrect';
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'Identifiant ou mot de passe incorrect';
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
    } catch (error: unknown) {
      toast({
        title: 'Erreur de connexion',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
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
          Connectez-vous avec votre email ou nom d'utilisateur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email ou nom d'utilisateur</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setErrors(prev => ({ ...prev, identifier: '' }));
              }}
              placeholder="email@exemple.com ou prenom.nom-agence"
              required
              className={errors.identifier ? 'border-destructive' : ''}
              autoComplete="username"
            />
            {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setForgotMode(true); setForgotEmail(identifier.includes('@') ? identifier : ''); }}
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