/**
 * BdStoryGeneratorForm — Formulaire de génération d'une histoire BD
 */
import { useState, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BdStoryGenerationInput, ProblemUniverse, StoryCampaignMode } from '../types/bdStory.types';

const UNIVERSES: { value: ProblemUniverse; label: string }[] = [
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'serrurerie', label: 'Serrurerie' },
  { value: 'vitrerie', label: 'Vitrerie' },
  { value: 'menuiserie', label: 'Menuiserie' },
  { value: 'peinture_renovation', label: 'Peinture / Rénovation' },
];

const TONES: { value: string; label: string }[] = [
  { value: 'rassurant', label: 'Rassurant' },
  { value: 'pedagogique', label: 'Pédagogique' },
  { value: 'reactif', label: 'Réactif' },
  { value: 'proximite', label: 'Proximité' },
];

const CAMPAIGNS: { value: StoryCampaignMode; label: string }[] = [
  { value: 'auto_balanced', label: 'Auto équilibré' },
  { value: 'seasonal', label: 'Saisonnier' },
  { value: 'mix_services', label: 'Mix services' },
  { value: 'urgence_only', label: 'Urgences uniquement' },
  { value: 'renovation_soft', label: 'Rénovation douce' },
];

interface Props {
  onGenerate: (params: Partial<BdStoryGenerationInput>) => Promise<any>;
  isGenerating: boolean;
}

export function BdStoryGeneratorForm({ onGenerate, isGenerating }: Props) {
  const [universe, setUniverse] = useState<string>('auto');
  const [tone, setTone] = useState<string>('auto');
  const [campaign, setCampaign] = useState<string>('auto_balanced');

  const handleGenerate = useCallback(() => {
    const params: Partial<BdStoryGenerationInput> = {
      campaignMode: campaign as StoryCampaignMode,
    };
    if (universe !== 'auto') params.universe = universe as ProblemUniverse;
    if (tone !== 'auto') params.tone = tone as any;
    onGenerate(params);
  }, [universe, tone, campaign, onGenerate]);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Univers métier</Label>
          <Select value={universe} onValueChange={setUniverse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatique</SelectItem>
              {UNIVERSES.map(u => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tonalité</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatique</SelectItem>
              {TONES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mode campagne</Label>
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAMPAIGNS.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full sm:w-auto gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération en cours…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Générer une histoire
          </>
        )}
      </Button>
    </div>
  );
}
