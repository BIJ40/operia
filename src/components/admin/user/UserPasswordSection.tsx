import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lock, RefreshCw, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPasswordSectionProps {
  userId: string;
}

export function UserPasswordSection({ userId }: UserPasswordSectionProps) {
  const { toast } = useToast();
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [sendPasswordEmail, setSendPasswordEmail] = useState(true);

  const generateRandomPassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%&*";
    
    let password = "";
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = password.length; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = async () => {
    if (!userId) return;

    setGeneratingPassword(true);
    try {
      const newPassword = generateRandomPassword();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('reset-user-password', {
        body: { 
          userId, 
          newPassword,
          sendEmail: sendPasswordEmail
        }
      });

      if (response.error) throw response.error;

      setGeneratedPassword(newPassword);
      
      toast({
        title: 'Mot de passe généré',
        description: sendPasswordEmail
          ? 'Le mot de passe temporaire a été créé et envoyé par email.'
          : 'Le mot de passe temporaire a été créé.',
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

  return (
    <Collapsible className="border rounded-lg border-destructive/30 bg-destructive/5">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-destructive/10">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-destructive" />
          <span className="font-medium">Mot de passe</span>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Génère un mot de passe temporaire. L'utilisateur devra le changer à la connexion.
        </p>

        <div className="flex items-center space-x-2">
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
                size="icon"
                onClick={copyPasswordToClipboard}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
