// Écran D - Récapitulatif + génération PDF

import { ArrowLeft, FileText, Image, Package, Send, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TechIntervention } from '../types';
import { useState } from 'react';
import { toast } from 'sonner';

interface AnswerSummary {
  nodeId: string;
  question: string;
  answer: string;
  branch: string;
}

interface RtSummaryScreenProps {
  intervention: TechIntervention;
  answers: AnswerSummary[];
  photos: string[];
  onBack: () => void;
  onEditQuestion: (nodeId: string) => void;
  onGeneratePdf: () => Promise<void>;
  onSaveDraft: () => void;
}

export function RtSummaryScreen({
  intervention,
  answers,
  photos,
  onBack,
  onEditQuestion,
  onGeneratePdf,
  onSaveDraft,
}: RtSummaryScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Group answers by branch
  const answersByBranch = answers.reduce((acc, answer) => {
    const branch = answer.branch || 'autre';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(answer);
    return acc;
  }, {} as Record<string, AnswerSummary[]>);

  const branchLabels: Record<string, string> = {
    contexte: 'Contexte général',
    fuite: 'Diagnostic fuite',
    bouchage: 'Diagnostic bouchage',
    robinetterie: 'Diagnostic robinetterie',
    chauffe_eau: 'Diagnostic chauffe-eau',
    wc: 'Diagnostic WC',
    autre: 'Autre problème',
    materiel: 'Matériel & approvisionnement',
    fin: 'Conclusion',
  };

  // Extract material answers if any
  const materialAnswers = answersByBranch['materiel'] || [];

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      await onGeneratePdf();
      toast.success('PDF généré et envoyé au bureau !');
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Récapitulatif du relevé</h1>
            <p className="text-xs text-muted-foreground">{intervention.dossierRef}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Client info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Client :</strong> {intervention.clientName}</p>
            <p><strong>Dossier :</strong> {intervention.dossierRef}</p>
            <p><strong>Adresse :</strong> {intervention.address}, {intervention.postalCode} {intervention.city}</p>
            <div className="flex gap-2 pt-2">
              <Badge variant="outline">{intervention.univers}</Badge>
              <Badge variant="secondary">{intervention.type}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Answers by branch */}
        {Object.entries(answersByBranch)
          .filter(([branch]) => branch !== 'fin')
          .map(([branch, branchAnswers]) => (
          <Card key={branch}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {branchLabels[branch] || branch}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {branchAnswers.map((answer, idx) => (
                <div 
                  key={answer.nodeId} 
                  className="flex items-start justify-between py-1 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">
                      {answer.question}
                    </p>
                    <p className="text-sm font-medium">{answer.answer}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onEditQuestion(answer.nodeId)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Material section (highlighted) */}
        {materialAnswers.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Matériel à prévoir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {materialAnswers.map((answer) => (
                <div key={answer.nodeId} className="py-1">
                  <p className="text-sm text-muted-foreground">{answer.question}</p>
                  <p className="text-sm font-medium">{answer.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Photos section */}
        {photos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" />
                Photos jointes ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((url, idx) => (
                  <div 
                    key={idx} 
                    className="aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    <img 
                      src={url} 
                      alt={`Photo ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 bg-background border-t p-4 space-y-2">
        <Button 
          className="w-full h-14 text-base font-semibold gap-2"
          size="lg"
          onClick={handleGeneratePdf}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Valider et envoyer le PDF
            </>
          )}
        </Button>
        <Button 
          variant="outline"
          className="w-full"
          onClick={onSaveDraft}
        >
          Enregistrer comme brouillon
        </Button>
      </div>
    </div>
  );
}

export default RtSummaryScreen;
