/**
 * Page signature client pour BI
 */

import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, PenTool, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SignaturePad, useSignaturePadRef } from '@/components/signature';
import { useBonIntervention } from '../hooks/useBonIntervention';
import { ROUTES } from '@/config/routes';

export default function BonInterventionSignature() {
  const navigate = useNavigate();
  const location = useLocation();
  const { interventionId } = useParams<{ interventionId: string }>();
  
  const { bonIntervention, addSignature } = useBonIntervention(
    interventionId ? Number(interventionId) : undefined
  );

  const signaturePadRef = useSignaturePadRef();
  const [signataireNom, setSignataireNom] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  const handleSignatureChange = (isEmpty: boolean) => {
    setHasSignature(!isEmpty);
  };

  const handleConfirm = () => {
    if (!bonIntervention) {
      toast.error('Bon d\'intervention non trouvé');
      return;
    }

    if (!hasSignature) {
      toast.error('Veuillez faire signer le client');
      return;
    }

    if (!signataireNom.trim()) {
      toast.error('Veuillez saisir le nom du signataire');
      return;
    }

    const signatureData = signaturePadRef.current?.getSignatureData();
    if (!signatureData) {
      toast.error('Erreur lors de la capture de la signature');
      return;
    }

    addSignature(bonIntervention.id, signatureData, signataireNom.trim());
    toast.success('Signature enregistrée');
    
    navigate(ROUTES.technicien.bonInterventionRecap.replace(':interventionId', interventionId!));
  };

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setHasSignature(false);
  };

  if (!bonIntervention) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            Bon d'intervention non trouvé
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 rounded-lg bg-green-500/10">
          <PenTool className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Signature client</h1>
          <p className="text-sm text-muted-foreground">{bonIntervention.refDossier}</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Client :</span>
              <p className="font-medium">{bonIntervention.clientNom}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Technicien :</span>
              <p className="font-medium">{bonIntervention.technicienNom}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identité du signataire</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="signataire">Nom et prénom</Label>
          <Input
            id="signataire"
            placeholder="Ex: Jean Dupont"
            value={signataireNom}
            onChange={(e) => setSignataireNom(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Signature</CardTitle>
          <CardDescription>Faites signer le client ci-dessous</CardDescription>
        </CardHeader>
        <CardContent>
          <SignaturePad
            ref={signaturePadRef}
            height={300}
            onChange={handleSignatureChange}
            showControls={false}
            className="border-2 border-dashed rounded-lg"
          />
          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Effacer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              En signant, le client atteste de la bonne exécution des travaux.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleConfirm} 
        className="w-full h-12 bg-green-600 hover:bg-green-700"
        disabled={!hasSignature || !signataireNom.trim()}
      >
        <Check className="h-5 w-5 mr-2" />
        Valider la signature
      </Button>
    </div>
  );
}
