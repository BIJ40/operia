import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  Trophy, 
  DollarSign, 
  FolderOpen, 
  BarChart3 
} from 'lucide-react';
import { DiffusionSettings } from '@/hooks/use-diffusion-settings';
import { useDiffusionKpisStatia } from './useDiffusionKpisStatia';

interface DiffusionKpiTilesProps {
  currentMonthIndex: number;
  settings: DiffusionSettings;
}

export const DiffusionKpiTiles = ({ currentMonthIndex, settings }: DiffusionKpiTilesProps) => {
  const { data, isLoading } = useDiffusionKpisStatia(currentMonthIndex);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5 animate-pulse bg-muted/20 h-32" />
        ))}
      </div>
    );
  }

  const {
    currentMonthCA,
    tauxSAV,
    caMoyenParTech,
    topTechnicien,
    nbDossiersRecus,
    moyenneParJour,
  } = data;

  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  const tiles = [
    {
      title: `CA ${currentMonthName}`,
      value: formatEuros(currentMonthCA),
      icon: DollarSign,
    },
    {
      title: 'Taux SAV',
      value: formatPercent(tauxSAV || 0),
      icon: TrendingUp,
    },
    {
      title: 'CA Moyen / Tech',
      value: formatEuros(caMoyenParTech),
      icon: Users,
    },
    {
      title: 'Top Technicien',
      value: topTechnicien?.nom || 'N/A',
      subtitle: topTechnicien ? formatEuros(topTechnicien.caHT) : undefined,
      icon: Trophy,
    },
    {
      title: 'Dossiers reçus',
      value: String(nbDossiersRecus),
      icon: FolderOpen,
    },
    {
      title: 'Moyenne CA/jour',
      value: formatEuros(moyenneParJour),
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {tiles.map((tile, idx) => (
        <Card
          key={idx}
          className="relative overflow-hidden rounded-xl border border-helpconfort-blue/15 border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/10 via-background to-background p-5 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {tile.title}
              </h3>
              <div className="rounded-full bg-helpconfort-blue/10 p-2 border border-helpconfort-blue/20">
                <tile.icon className="h-4 w-4 text-helpconfort-blue" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground truncate">{tile.value}</p>
            {tile.subtitle && (
              <p className="text-xs text-muted-foreground">{tile.subtitle}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
