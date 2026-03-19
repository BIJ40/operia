/**
 * RegenerationPromptPanel — Panneau inline sous un post pour personnaliser la régénération.
 * Ton, mots-clés métier, cible audience, longueur.
 */

import { useState, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface RegenerationPrompt {
  tone: string;
  keywords: string;
  audience: string;
  length: 'court' | 'moyen' | 'long';
  freePrompt: string;
}

const TONE_OPTIONS = [
  { value: 'professionnel', label: 'Pro', emoji: '🎯' },
  { value: 'humour', label: 'Humour', emoji: '😄' },
  { value: 'bienveillant', label: 'Bienveillant', emoji: '🤗' },
  { value: 'urgent', label: 'Urgent', emoji: '🚨' },
  { value: 'inspirant', label: 'Inspirant', emoji: '✨' },
  { value: 'decontracte', label: 'Décontracté', emoji: '😎' },
  { value: 'pedagogue', label: 'Pédagogue', emoji: '📚' },
  { value: 'rassurant', label: 'Rassurant', emoji: '🤝' },
];

const AUDIENCE_OPTIONS = [
  { value: 'proprietaires', label: 'Propriétaires' },
  { value: 'locataires', label: 'Locataires' },
  { value: 'syndics', label: 'Syndics' },
  { value: 'agences_immo', label: 'Agences immo' },
  { value: 'tous', label: 'Tous publics' },
];

const LENGTH_OPTIONS: { value: RegenerationPrompt['length']; label: string; desc: string }[] = [
  { value: 'court', label: 'Court', desc: 'Accroche percutante' },
  { value: 'moyen', label: 'Moyen', desc: 'Standard' },
  { value: 'long', label: 'Long', desc: 'Storytelling' },
];

interface RegenerationPromptPanelProps {
  onRegenerate: (prompt: RegenerationPrompt) => void;
  isRegenerating?: boolean;
  disabled?: boolean;
}

export function RegenerationPromptPanel({ onRegenerate, isRegenerating, disabled }: RegenerationPromptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tone, setTone] = useState('professionnel');
  const [keywords, setKeywords] = useState('');
  const [audience, setAudience] = useState('tous');
  const [length, setLength] = useState<RegenerationPrompt['length']>('moyen');

  const handleRegenerate = useCallback(() => {
    onRegenerate({ tone, keywords: keywords.trim(), audience, length });
  }, [onRegenerate, tone, keywords, audience, length]);

  if (disabled) return null;

  return (
    <div className="border-t border-border pt-2 space-y-2">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Sparkles className="w-3 h-3" />
        <span className="font-medium">Personnaliser la régénération</span>
        {isOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-md p-3 border border-border">
          {/* Ton */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ton</Label>
            <div className="flex flex-wrap gap-1">
              {TONE_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={tone === opt.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-[10px] transition-colors hover:bg-primary/10',
                    tone === opt.value && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setTone(opt.value)}
                >
                  {opt.emoji} {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mots-clés */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Mots-clés / orientation
            </Label>
            <Input
              placeholder="Ex: ballon eau chaude, terrasse bois, économies énergie…"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          {/* Cible audience */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cible</Label>
            <div className="flex flex-wrap gap-1">
              {AUDIENCE_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={audience === opt.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-[10px] transition-colors hover:bg-primary/10',
                    audience === opt.value && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setAudience(opt.value)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Longueur */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Longueur</Label>
            <div className="flex gap-1.5">
              {LENGTH_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={length === opt.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-[10px] transition-colors hover:bg-primary/10',
                    length === opt.value && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setLength(opt.value)}
                >
                  {opt.label}
                  <span className="text-[9px] opacity-70 ml-0.5">({opt.desc})</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Bouton régénérer */}
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <Sparkles className="w-3 h-3" />
            {isRegenerating ? 'Régénération en cours…' : 'Régénérer avec ces paramètres'}
          </Button>
        </div>
      )}
    </div>
  );
}
