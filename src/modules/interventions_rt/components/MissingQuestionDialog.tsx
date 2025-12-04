// Dialog pour signaler une question manquante

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface MissingQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  univers: string;
  branch: string;
  onSubmit: (data: {
    suggestion_text: string;
    position_hint: 'before' | 'after' | 'replace';
    suggested_type: string;
  }) => void;
}

export function MissingQuestionDialog({
  open,
  onOpenChange,
  nodeId,
  univers,
  branch,
  onSubmit,
}: MissingQuestionDialogProps) {
  const [suggestionText, setSuggestionText] = useState('');
  const [positionHint, setPositionHint] = useState<'before' | 'after' | 'replace'>('after');
  const [suggestedType, setSuggestedType] = useState('single_choice');

  const handleSubmit = () => {
    if (!suggestionText.trim()) {
      toast.error('Veuillez décrire la question manquante');
      return;
    }

    onSubmit({
      suggestion_text: suggestionText.trim(),
      position_hint: positionHint,
      suggested_type: suggestedType,
    });

    // Reset form
    setSuggestionText('');
    setPositionHint('after');
    setSuggestedType('single_choice');
    
    toast.success('Suggestion envoyée ! Merci pour votre retour.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suggérer une question</DialogTitle>
          <DialogDescription>
            Une question manque pour décrire correctement la situation ? Suggérez-la ici.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Context info */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <p><strong>Univers :</strong> {univers}</p>
            <p><strong>Branche :</strong> {branch || 'Contexte'}</p>
            <p><strong>Question actuelle :</strong> {nodeId}</p>
          </div>

          {/* Suggestion text */}
          <div className="space-y-2">
            <Label htmlFor="suggestion">Quelle question manque ?</Label>
            <Textarea
              id="suggestion"
              placeholder="Ex: Le compteur d'eau est-il accessible ?"
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Position hint */}
          <div className="space-y-2">
            <Label>Où la verrais-tu ?</Label>
            <RadioGroup value={positionHint} onValueChange={(v) => setPositionHint(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="before" id="before" />
                <Label htmlFor="before" className="font-normal">Avant la question actuelle</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after" id="after" />
                <Label htmlFor="after" className="font-normal">Après la question actuelle</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="font-normal">En remplacement</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Suggested type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type de réponse souhaitée</Label>
            <Select value={suggestedType} onValueChange={setSuggestedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Oui / Non</SelectItem>
                <SelectItem value="single_choice">Choix simple</SelectItem>
                <SelectItem value="multi_choice">Choix multiple</SelectItem>
                <SelectItem value="text">Texte court</SelectItem>
                <SelectItem value="text_long">Texte long</SelectItem>
                <SelectItem value="number">Nombre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Envoyer la suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MissingQuestionDialog;
