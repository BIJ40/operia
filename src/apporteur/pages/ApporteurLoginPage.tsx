/**
 * ApporteurLoginPage - Page de connexion OTP pour les apporteurs
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApporteurSession } from '../contexts/ApporteurSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Loader2, 
  Building2, 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  Home,
  Check,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type LoginStep = 'email' | 'code';

export function ApporteurLoginPage() {
  const navigate = useNavigate();
  const { requestCode, verifyCode } = useApporteurSession();
  
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await requestCode(email.trim());
      
      if (result.success) {
        setCodeSent(true);
        setStep('code');
        toast.success('Code envoyé par email');
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Request code error:', err);
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await verifyCode(email.trim(), code.trim());
      
      if (result.success) {
        toast.success('Connexion réussie');
        navigate('/apporteur/dashboard');
      } else {
        setError(result.error || 'Code invalide');
        setCode(''); // Clear code on error
      }
    } catch (err) {
      console.error('Verify code error:', err);
      setError('Erreur de vérification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setLoading(true);
    setCode('');

    try {
      const result = await requestCode(email.trim());
      
      if (result.success) {
        toast.success('Nouveau code envoyé');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Erreur lors du renvoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="w-full bg-gradient-hero">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-primary-foreground text-lg font-medium">
            Espace Partenaires Apporteurs d'Affaires
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Connexion Apporteur
            </h1>
            <p className="text-muted-foreground mt-2">
              Accédez à votre espace partenaire HelpConfort
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-card border rounded-2xl p-6 shadow-apporteur">
            {step === 'email' ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !email.includes('@')}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Recevoir un code de connexion
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                {/* Email confirmation */}
                <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <p className="text-sm">
                    Code envoyé à <span className="font-medium">{email}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code à 6 chiffres</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setCode(val);
                      }}
                      className={cn(
                        "pl-10 text-center text-2xl tracking-[0.5em] font-mono",
                        code.length === 6 && "border-primary"
                      )}
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Le code expire dans 15 minutes
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Changer d'email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Renvoyer le code
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Vous n'avez pas de compte ? Contactez votre agence HelpConfort.
            </p>
          </div>

          {/* Back to home */}
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              size="sm"
              asChild
              className="text-muted-foreground"
            >
              <a href="http://www.helpconfort-40.fr" rel="noopener noreferrer">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
              </a>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} HelpConfort Services - Espace Apporteur</p>
        </div>
      </footer>
    </div>
  );
}

export default ApporteurLoginPage;
