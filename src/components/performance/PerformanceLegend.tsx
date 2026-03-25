/**
 * PerformanceLegend - Bouton légende avec seuils au survol
 */

import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const THRESHOLDS = {
  productivity: {
    title: 'Productivité',
    description: 'Temps productif / Temps total planifié',
    zones: [
      { label: 'Optimal', range: '≥ 65%', color: 'bg-green-500' },
      { label: 'Attention', range: '50% - 65%', color: 'bg-amber-500' },
      { label: 'Critique', range: '< 50%', color: 'bg-red-500' },
    ],
  },
  load: {
    title: 'Charge',
    description: 'Temps planifié / Capacité (heures contrat)',
    zones: [
      { label: 'Équilibré', range: '80% - 110%', color: 'bg-green-500' },
      { label: 'Sous-charge', range: '< 80%', color: 'bg-amber-500' },
      { label: 'Surcharge', range: '> 110%', color: 'bg-red-500' },
    ],
  },
  sav: {
    title: 'Taux SAV',
    description: 'Interventions SAV / Total interventions',
    zones: [
      { label: 'Optimal', range: '≤ 3%', color: 'bg-green-500' },
      { label: 'Attention', range: '3% - 8%', color: 'bg-amber-500' },
      { label: 'Critique', range: '> 8%', color: 'bg-red-500' },
    ],
  },
  composite: {
    title: 'Score composite (Heatmap)',
    description: 'Somme des scores (0-2) sur chaque axe',
    zones: [
      { label: 'Zone de confort', range: '≥ 5 pts', color: 'bg-green-500' },
      { label: 'Zone d\'optimisation', range: '3-4 pts', color: 'bg-amber-500' },
      { label: 'Zone de tension', range: '< 3 pts', color: 'bg-red-500' },
    ],
  },
};

function ThresholdSection({ title, description, zones }: { 
  title: string; 
  description: string; 
  zones: { label: string; range: string; color: string }[];
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="space-y-1">
        {zones.map((zone, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${zone.color}`} />
            <span className="flex-1">{zone.label}</span>
            <span className="text-muted-foreground font-mono">{zone.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PerformanceLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div className="font-semibold text-sm">Seuils de performance</div>
          
          <ThresholdSection {...THRESHOLDS.productivity} />
          <Separator />
          <ThresholdSection {...THRESHOLDS.load} />
          <Separator />
          <ThresholdSection {...THRESHOLDS.sav} />
          <Separator />
          <ThresholdSection {...THRESHOLDS.composite} />
          
          <div className="text-[10px] text-muted-foreground pt-2 border-t">
            La capacité est calculée depuis la durée hebdo de la fiche collaborateur (défaut: 35h/semaine).
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
