/**
 * Dialog pour générer un document RH tamponné (PDF)
 * RH-P0-01: Génération PDF avec tampon société + nom validateur
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Loader2, FileSignature, Stamp, CheckCircle2 } from 'lucide-react';
import { useGenerateHRDocument, useAgencyStamps } from '@/hooks/useGenerateHRDocument';
import { GENERATED_DOCUMENT_TYPES, type GeneratedDocumentType } from '@/types/hrGenerated';
import { DOCUMENT_REQUEST_TYPES } from '@/types/documentRequest';

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId?: string;
  requestType?: string;
  collaboratorId: string;
  collaboratorName: string;
  onSuccess?: (documentId: string) => void;
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  requestId,
  requestType,
  collaboratorId,
  collaboratorName,
  onSuccess,
}: GenerateDocumentDialogProps) {
  const generateMutation = useGenerateHRDocument();
  const { data: stamps = [], isLoading: isLoadingStamps } = useAgencyStamps();
  
  // Map request type to document type
  const defaultDocType = requestType === 'ATTESTATION_EMPLOYEUR' 
    ? 'ATTESTATION_EMPLOYEUR'
    : requestType === 'SOLDE_CONGES'
    ? 'SOLDE_CONGES'
    : 'AUTRE';

  const defaultTitle = requestType 
    ? DOCUMENT_REQUEST_TYPES.find(t => t.value === requestType)?.label || ''
    : '';

  const [documentType, setDocumentType] = useState<GeneratedDocumentType>(defaultDocType);
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const hasStamp = stamps.some(s => s.stamp_type === 'logo');

  const handleGenerate = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      const result = await generateMutation.mutateAsync({
        request_id: requestId,
        document_type: documentType,
        title: title.trim(),
        content: content.trim(),
        collaborator_id: collaboratorId,
      });

      if (result.success && result.data) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onOpenChange(false);
          onSuccess?.(result.data!.vault_document_id);
          // Reset form
          setTitle(defaultTitle);
          setContent('');
        }, 1500);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    if (!generateMutation.isPending) {
      onOpenChange(false);
    }
  };

  // Template content based on document type
  const getTemplateContent = (type: GeneratedDocumentType): string => {
    const templates: Record<GeneratedDocumentType, string> = {
      ATTESTATION_EMPLOYEUR: `Je soussigné(e), agissant en qualité de responsable des ressources humaines, atteste que M./Mme ${collaboratorName} fait partie de notre entreprise.

Cette attestation est délivrée à la demande de l'intéressé(e) pour servir et valoir ce que de droit.`,
      
      SOLDE_CONGES: `Nous certifions que M./Mme ${collaboratorName} dispose du solde de congés suivant à la date du ${new Date().toLocaleDateString('fr-FR')} :

- Congés payés acquis : _____ jours
- Congés payés pris : _____ jours
- Solde restant : _____ jours
- RTT acquis : _____ jours
- RTT pris : _____ jours`,
      
      CERTIFICAT_TRAVAIL: `Je soussigné(e), certifie que M./Mme ${collaboratorName} a été employé(e) au sein de notre entreprise.

Pendant cette période, M./Mme ${collaboratorName} a occupé le poste de [FONCTION].

Ce certificat est délivré conformément aux dispositions de l'article L. 1234-19 du Code du travail.`,
      
      AUTRE: ``,
    };
    return templates[type];
  };

  const handleTypeChange = (type: GeneratedDocumentType) => {
    setDocumentType(type);
    const label = GENERATED_DOCUMENT_TYPES.find(t => t.value === type)?.label || '';
    setTitle(label);
    if (!content.trim()) {
      setContent(getTemplateContent(type));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Générer un document PDF
          </DialogTitle>
          <DialogDescription>
            Le document sera généré avec l'en-tête de l'agence, le tampon officiel et votre signature.
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-pulse" />
            <p className="text-lg font-medium text-green-700">Document généré avec succès !</p>
          </div>
        ) : (
          <>
            {/* Stamp status */}
            <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
              hasStamp 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <Stamp className="h-4 w-4" />
              {hasStamp 
                ? 'Un tampon d\'agence est configuré et sera appliqué au document.'
                : 'Aucun tampon configuré. Le document sera généré sans tampon visuel.'
              }
            </div>

            <div className="space-y-4">
              {/* Collaborator */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Destinataire</Label>
                <div className="font-medium">{collaboratorName}</div>
              </div>

              {/* Document type */}
              <div className="space-y-2">
                <Label htmlFor="doc-type">Type de document</Label>
                <Select value={documentType} onValueChange={handleTypeChange}>
                  <SelectTrigger id="doc-type" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {GENERATED_DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="doc-title">Titre du document</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Attestation de travail"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="doc-content">Contenu du document</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-6"
                    onClick={() => setContent(getTemplateContent(documentType))}
                  >
                    Utiliser un modèle
                  </Button>
                </div>
                <Textarea
                  id="doc-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  placeholder="Saisissez le contenu du document..."
                  className="font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Le document sera automatiquement mis en forme avec l'en-tête de l'agence, la date, et votre signature.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={generateMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !title.trim() || !content.trim()}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Générer le PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
