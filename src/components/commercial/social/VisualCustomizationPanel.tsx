/**
 * VisualCustomizationPanel — Panneau pour personnaliser la génération du VISUEL IA.
 * Les paramètres saisis ici sont envoyés directement au prompt de génération d'image.
 */

import { useState, useCallback, useEffect } from 'react';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface VisualCustomization {
  freePrompt: string;
  keywords: string;
  tone?: string;
  audience?: string;
}

interface VisualCustomizationPanelProps {
  onCustomize: (customization: VisualCustomization | null) => void;
  disabled?: boolean;
}

export function VisualCustomizationPanel({ onCustomize, disabled }: VisualCustomizationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [freePrompt, setFreePrompt] = useState('');
  const [keywords, setKeywords] = useState('');

  // Notify parent whenever values change
  useEffect(() => {
    const trimmedPrompt = freePrompt.trim();
    const trimmedKeywords = keywords.trim();
    if (trimmedPrompt || trimmedKeywords) {
      onCustomize({ freePrompt: trimmedPrompt, keywords: trimmedKeywords });
    } else {
      onCustomize(null);
    }
  }, [freePrompt, keywords, onCustomize]);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        disabled={disabled}
      >
        <Palette className="w-3 h-3" />
        <span className="font-medium">Personnaliser le visuel</span>
        {(freePrompt.trim() || keywords.trim()) && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />
        )}
        {isOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-md p-3 border border-border">
          {/* Directive libre */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              🎨 Directive visuelle (prioritaire)
            </Label>
            <Textarea
              placeholder={'Ex: "spot LED encastré remplaçant une vieille ampoule, image moderne et lumineuse" ou "robinet qui fuit avec gouttes d\'eau visibles"'}
              value={freePrompt}
              onChange={e => setFreePrompt(e.target.value)}
              className="text-xs min-h-[60px] resize-y"
              rows={3}
              disabled={disabled}
            />
            <p className="text-[10px] text-muted-foreground/60">
              Décrivez la scène, l'objet ou l'ambiance souhaitée. Cette directive remplace le prompt automatique.
            </p>
          </div>

          {/* Mots-clés visuels */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Mots-clés visuels
            </Label>
            <Input
              placeholder="Ex: LED, moderne, lumineux, cuisine…"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              className="h-7 text-xs"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
