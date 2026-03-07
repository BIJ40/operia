import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, KeyRound, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Listen for PASSWORD_RECOVERY event (fires if token is in URL hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (mounted && event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Check if already in a session (redirected from App.tsx after PASSWORD_RECOVERY)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) {
        setSessionReady(true);
      } else if (mounted) {
        // Give Supabase a moment to process the hash token, then check again
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (mounted) {
              // Show the form regardless — updateUser will fail gracefully if no session
              setSessionReady(true);
            }
          });
        }, 2000);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]{8,100}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un symbole.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Reset the must_change_password flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false } as any)
          .eq('id', user.id);
      }

      setSuccess(true);
      toast({ title: 'Mot de passe mis à jour', description: 'Vous allez être redirigé.' });
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-lg font-medium text-center">Mot de passe mis à jour avec succès !</p>
            <p className="text-sm text-muted-foreground">Redirection en cours…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Vérification du lien de réinitialisation…
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Si rien ne se passe, le lien est peut-être expiré ou invalide.
              <br />
              <button onClick={() => navigate('/')} className="underline text-primary mt-2">
                Retour à la connexion
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <KeyRound className="w-5 h-5" />
            Nouveau mot de passe
          </CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe sécurisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                placeholder="8+ caractères (MAJ, min, chiffre, symbole)"
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                placeholder="Retapez le nouveau mot de passe"
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mise à jour…
                </>
              ) : (
                'Définir le mot de passe'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
