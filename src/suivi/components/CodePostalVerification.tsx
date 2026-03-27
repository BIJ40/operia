import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CodePostalVerificationProps {
  refDossier: string;
  agencySlug?: string;
  hash: string;
  onVerified: (codePostal: string) => void;
}

export function CodePostalVerification({ refDossier, agencySlug, hash, onVerified }: CodePostalVerificationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [codePostal, setCodePostal] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codePostal.trim() || codePostal.length !== 5) {
      toast.error("Veuillez entrer un code postal valide (5 chiffres)");
      return;
    }

    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('suivi-api-proxy', {
        body: { 
          refDossier,
          agencySlug: agencySlug || 'dax',
          codePostal: codePostal.trim(),
          hash,
          verifyOnly: true
        }
      });

      if (error || data?.accessDenied || data?.error) {
        setAttempts(prev => prev + 1);
        toast.error("Code postal incorrect");
        
        if (attempts >= 2) {
          toast.info("Indice : Il s'agit du code postal de l'adresse d'intervention");
        }
        
        if (inputRef.current) {
          inputRef.current.focus();
        }
        return;
      }

      if (data?.verified) {
        toast.success("Bienvenue !", {
          description: "Accès vérifié",
          duration: 3000,
        });
        setIsOpen(false);
        onVerified(codePostal.trim());
      }
    } catch (err) {
      toast.error("Erreur de vérification");
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) return;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Vérification d'accès</DialogTitle>
          <DialogDescription>
            Pour accéder au suivi de votre dossier, veuillez entrer le code postal de l'adresse d'intervention.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleVerify} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              id="codePostal"
              placeholder="Code postal (ex: 75001)"
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
              maxLength={5}
              className="text-center text-lg"
              ref={inputRef}
              disabled={isVerifying}
              autoFocus
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isVerifying || codePostal.length !== 5}>
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              "Vérifier"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
