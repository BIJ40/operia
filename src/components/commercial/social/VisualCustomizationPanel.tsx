/**
 * VisualCustomizationPanel — Panneau pour personnaliser la génération du VISUEL IA.
 * Les paramètres saisis ici sont envoyés directement au prompt de génération d'image.
 */

import { useState, useEffect } from 'react';
import { Palette, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface VisualCustomization {
  freePrompt: string;
  keywords: string;
  includeVan?: boolean;
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
  const [includeVan, setIncludeVan] = useState(false);

  // Notify parent whenever values change
  useEffect(() => {
    const trimmedPrompt = freePrompt.trim();
    const trimmedKeywords = keywords.trim();
    if (trimmedPrompt || trimmedKeywords || includeVan) {
      onCustomize({ freePrompt: trimmedPrompt, keywords: trimmedKeywords, includeVan });
    } else {
      onCustomize(null);
    }
  }, [freePrompt, keywords, includeVan, onCustomize]);

  const hasCustomization = freePrompt.trim() || keywords.trim() || includeVan;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        disabled={disabled}
      >
        <Palette className="w-3 h-3" />
        <span className="font-medium">Personnaliser le visuel</span>
        {hasCustomization && (
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
              placeholder={'Ex: "spot LED encastré remplaçant une vieille ampoule, image moderne et lumineuse"'}
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

          {/* Include van toggle */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-medium">Inclure le véhicule HC</p>
                <p className="text-[10px] text-muted-foreground/60">
                  Photo réelle du van Help Confort intégrée au visuel
                </p>
              </div>
            </div>
            <Switch
              checked={includeVan}
              onCheckedChange={setIncludeVan}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
