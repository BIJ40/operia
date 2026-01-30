/**
 * DiffusionKpiTiles - Tiles KPI pour Diffusion TV
 * 8 tiles avec design Warm Pastel aligné sur Stats
 */

import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';
import { Card } from '@/components/ui/card';
import { 
  DollarSign,
  Target,
  ShoppingCart,
  AlertTriangle,
  Clock,
  FolderOpen,
  Building2,
  Layers
} from 'lucide-react';
import { DiffusionSettings } from '@/hooks/use-diffusion-settings';
import { useDiffusionKpisStatia } from './useDiffusionKpisStatia';
import { cn } from '@/lib/utils';

interface DiffusionKpiTilesProps {
  currentMonthIndex: number;
  settings: DiffusionSettings;
}

const TILE_COLORS = {
  blue: {
    border: 'border-l-warm-blue',
    bg: 'from-warm-blue/10',
    icon: 'bg-warm-blue/10 border-warm-blue/20 text-warm-blue',
  },
  orange: {
    border: 'border-l-warm-orange',
    bg: 'from-warm-orange/10',
    icon: 'bg-warm-orange/10 border-warm-orange/20 text-warm-orange',
  },
  purple: {
    border: 'border-l-warm-purple',
    bg: 'from-warm-purple/10',
    icon: 'bg-warm-purple/10 border-warm-purple/20 text-warm-purple',
  },
  red: {
    border: 'border-l-warm-red',
    bg: 'from-warm-red/10',
    icon: 'bg-warm-red/10 border-warm-red/20 text-warm-red',
  },
  teal: {
    border: 'border-l-warm-teal',
    bg: 'from-warm-teal/10',
    icon: 'bg-warm-teal/10 border-warm-teal/20 text-warm-teal',
  },
  green: {
    border: 'border-l-warm-green',
    bg: 'from-warm-green/10',
    icon: 'bg-warm-green/10 border-warm-green/20 text-warm-green',
  },
  pink: {
    border: 'border-l-warm-pink',
    bg: 'from-warm-pink/10',
    icon: 'bg-warm-pink/10 border-warm-pink/20 text-warm-pink',
  },
  cyan: {
    border: 'border-l-helpconfort-blue',
    bg: 'from-helpconfort-blue/10',
    icon: 'bg-helpconfort-blue/10 border-helpconfort-blue/20 text-helpconfort-blue',
  },
};

export const DiffusionKpiTiles = ({ currentMonthIndex, settings }: DiffusionKpiTilesProps) => {
  const { data, isLoading } = useDiffusionKpisStatia(currentMonthIndex);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-5 animate-pulse bg-muted/20 h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const {
    currentMonthCA,
    tauxSAV,
    panierMoyen,
    delaiMoyen,
    nbDossiersRecus,
    topApporteur,
    topUnivers,
  } = data;

  // Calcul objectif restant
  const objectifRestant = Math.max(0, (settings.objectif_amount || 0) - currentMonthCA);

  const currentMonthName = new Date(new Date().getFullYear(), currentMonthIndex, 1)
    .toLocaleDateString('fr-FR', { month: 'long' });

  const tiles = [
    {
      title: `CA ${currentMonthName}`,
      value: formatEuros(currentMonthCA),
      icon: DollarSign,
      color: 'blue' as const,
    },
    {
      title: 'Objectif restant',
      value: objectifRestant > 0 ? `-${formatEuros(objectifRestant)}` : '✓ Atteint',
      subtitle: settings.objectif_title || undefined,
      icon: Target,
      color: 'orange' as const,
    },
    {
      title: 'Panier moyen',
      value: formatEuros(panierMoyen),
      icon: ShoppingCart,
      color: 'purple' as const,
    },
    {
      title: 'Taux SAV',
      value: formatPercent(tauxSAV || 0),
      icon: AlertTriangle,
      color: 'red' as const,
    },
    {
      title: 'Délai moyen',
      value: delaiMoyen > 0 ? `${Math.round(delaiMoyen)}j` : 'N/A',
      icon: Clock,
      color: 'teal' as const,
    },
    {
      title: 'Dossiers reçus',
      value: String(nbDossiersRecus),
      icon: FolderOpen,
      color: 'green' as const,
    },
    {
      title: 'TOP Apporteur',
      value: topApporteur?.name || 'N/A',
      subtitle: topApporteur ? formatEuros(topApporteur.ca) : undefined,
      icon: Building2,
      color: 'pink' as const,
    },
    {
      title: 'TOP Domaine',
      value: topUnivers?.name || 'N/A',
      subtitle: topUnivers ? formatEuros(topUnivers.ca) : undefined,
      icon: Layers,
      color: 'cyan' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map((tile, idx) => {
        const colorConfig = TILE_COLORS[tile.color];
        return (
          <Card
            key={idx}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-border/30 border-l-4 p-5',
              'bg-gradient-to-br via-background to-background',
              'shadow-sm hover:shadow-md transition-all',
              colorConfig.border,
              colorConfig.bg
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {tile.title}
                </h3>
                <div className={cn(
                  'rounded-full p-2 border',
                  colorConfig.icon
                )}>
                  <tile.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground truncate">{tile.value}</p>
              {tile.subtitle && (
                <p className="text-xs text-muted-foreground truncate">{tile.subtitle}</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

