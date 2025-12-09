/**
 * Page signature client pour PV Apporteur
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PenTool, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SignaturePad, useSignaturePadRef } from '@/components/signature';
import { usePvApporteur } from '../hooks/usePvApporteur';
import { ROUTES } from '@/config/routes';

export default function PvApporteurSignature() {
  const navigate = useNavigate();
  const { dossierId } = useParams<{ dossierId: string }>();
  
  const { pvApporteur, addSignatureClient } = usePvApporteur(
    dossierId ? Number(dossierId) : undefined
  );

  const signaturePadRef = useSignaturePadRef();
  const [signataireNom, setSignataireNom] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  const handleSignatureChange = (isEmpty: boolean) => {
    setHasSignature(!isEmpty);
  };

  const handleConfirm = () => {
    if (!pvApporteur) {
      toast.error('PV non trouvé');
      return;
    }

    if (!hasSignature) {
      toast.error('Veuillez faire signer');
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

    addSignatureClient(pvApporteur.id, signatureData, signataireNom.trim());
    toast.success('Signature enregistrée');
    
    navigate(`/technicien/pv-apporteur/${dossierId}/recap`);
  };

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setHasSignature(false);
  };

  if (!pvApporteur) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            PV non trouvé
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
        <div className="p-2 rounded-lg bg-blue-500/10">
          <PenTool className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Signature</h1>
          <p className="text-sm text-muted-foreground">{pvApporteur.refDossier}</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Client :</span>
              <p className="font-medium">{pvApporteur.clientNom}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Représentant :</span>
              <p className="font-medium">{pvApporteur.technicienNom}</p>
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
          <CardTitle className="text-base">Signature client</CardTitle>
          <CardDescription>Faites signer ci-dessous</CardDescription>
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

      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              En signant, le client atteste avoir procédé à la réception des travaux 
              {pvApporteur.sansReserve ? ' sans réserve' : ' avec les réserves mentionnées'}.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleConfirm} 
        className="w-full h-12 bg-blue-600 hover:bg-blue-700"
        disabled={!hasSignature || !signataireNom.trim()}
      >
        <Check className="h-5 w-5 mr-2" />
        Valider la signature
      </Button>
    </div>
  );
}
