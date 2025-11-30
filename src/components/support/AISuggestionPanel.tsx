/**
 * P3#2 - Panneau de suggestions IA pour les tickets support
 * Affiche la réponse suggérée et permet de l'insérer
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, Check, RefreshCw, BookOpen, Database } from 'lucide-react';
import { AI_CATEGORY_LABELS } from '@/lib/support-auto';
import { reclassifyTicket } from '@/lib/support-auto';
import { toast } from 'sonner';

interface AISuggestionPanelProps {
  ticketId: string;
  category?: string | null;
  priority?: string | null;
  confidence?: number | null;
  suggestedAnswer?: string | null;
  suggestedAnswerSource?: 'faq' | 'rag' | 'template' | null;
  tags?: string[] | null;
  isIncomplete?: boolean;
  onInsertSuggestion?: (text: string) => void;
  onReclassify?: () => void;
}

export function AISuggestionPanel({
  ticketId,
  category,
  priority,
  confidence,
  suggestedAnswer,
  suggestedAnswerSource,
  tags,
  isIncomplete,
  onInsertSuggestion,
  onReclassify,
}: AISuggestionPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);

  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;

  const handleCopy = async () => {
    if (!suggestedAnswer) return;
    
    try {
      await navigator.clipboard.writeText(suggestedAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleInsert = () => {
    if (suggestedAnswer && onInsertSuggestion) {
      onInsertSuggestion(suggestedAnswer);
      toast.success('Suggestion insérée');
    }
  };

  const handleReclassify = async () => {
    setIsReclassifying(true);
    try {
      const result = await reclassifyTicket(ticketId);
      if (result.success) {
        toast.success('Ticket reclassifié');
        onReclassify?.();
      } else {
        toast.error(result.error || 'Erreur de reclassification');
      }
    } catch (error) {
      toast.error('Erreur lors de la reclassification');
    } finally {
      setIsReclassifying(false);
    }
  };

  const sourceIcon = suggestedAnswerSource === 'faq' ? BookOpen : Database;
  const sourceLabel = suggestedAnswerSource === 'faq' ? 'FAQ' : suggestedAnswerSource === 'rag' ? 'RAG' : 'Template';
  const SourceIcon = sourceIcon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Classification IA
          <Badge variant="outline" className="ml-auto text-xs">
            {confidencePercent}% confiance
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Classification */}
        <div className="flex flex-wrap gap-2 text-sm">
          {category && (
            <Badge variant="secondary">
              {AI_CATEGORY_LABELS[category] || category}
            </Badge>
          )}
          {priority && (
            <Badge 
              variant="outline"
              className={
                priority === 'bloquant' ? 'border-red-500 text-red-600' :
                priority === 'urgent' ? 'border-orange-500 text-orange-600' :
                priority === 'important' ? 'border-yellow-500 text-yellow-600' :
                'border-gray-400 text-gray-600'
              }
            >
              {priority}
            </Badge>
          )}
          {isIncomplete && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              ⚠️ Incomplet
            </Badge>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Suggestion de réponse */}
        {suggestedAnswer && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <SourceIcon className="w-3 h-3" />
              Source: {sourceLabel}
            </div>
            <div className="bg-background rounded-md p-3 text-sm border max-h-40 overflow-y-auto">
              {suggestedAnswer}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copier
                  </>
                )}
              </Button>
              {onInsertSuggestion && (
                <Button
                  size="sm"
                  onClick={handleInsert}
                  className="flex-1"
                >
                  Insérer dans réponse
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReclassify}
            disabled={isReclassifying}
            className="w-full"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isReclassifying ? 'animate-spin' : ''}`} />
            {isReclassifying ? 'Reclassification...' : 'Reclasser avec IA'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
