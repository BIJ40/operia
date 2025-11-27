import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateDashboardStats } from '@/apogee-connect/utils/dashboardCalculations';
import { calculateMonthlyCA } from '@/apogee-connect/utils/monthlyCalculations';
import { calculateUniversStats } from '@/apogee-connect/utils/universCalculations';
import { calculateTop10Apporteurs } from '@/apogee-connect/utils/apporteursCalculations';
import { calculateSAVGlobalStats } from '@/apogee-connect/utils/savCalculations';
import { buildTechMap } from '@/apogee-connect/utils/techTools';
import { formatEuros, formatPercent, formatUniverseLabel } from '@/apogee-connect/utils/formatters';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target, Users, Star, DollarSign, AlertCircle } from 'lucide-react';
import { DiffusionSettings } from '@/hooks/use-diffusion-settings';

interface DiffusionKpiTilesProps {
  currentMonthIndex: number;
  settings: DiffusionSettings;
}

export const DiffusionKpiTiles = ({ currentMonthIndex, settings }: DiffusionKpiTilesProps) => {
  const { agence } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['diffusion-kpis', agence, currentMonthIndex],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true);
      return allData;
    },
    enabled: !!agence,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="p-6 animate-pulse bg-muted/20" />
        ))}
      </div>
    );
  }

  const currentDate = new Date();
  currentDate.setMonth(currentMonthIndex);
  
  const dateRange = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };

  const yearRange = {
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  };

  // Calculs
  const dashboardStats = calculateDashboardStats(
    {
      projects: data.projects || [],
      interventions: data.interventions || [],
      factures: data.factures || [],
      devis: data.devis || [],
      clients: data.clients || [],
      users: data.users || [],
    },
    dateRange,
    agence || ''
  );
  
  const monthlyCA = calculateMonthlyCA(
    data.factures || [],
    data.clients || [],
    data.projects || [],
    currentDate.getFullYear(),
    agence || ''
  );
  const currentMonthCA = monthlyCA.find(m => m.month === monthNames[currentMonthIndex])?.ca || 0;
  
  const universStats = calculateUniversStats(
    data.factures || [],
    data.projects || [],
    data.interventions || [],
    dateRange
  );
  const topUnivers = [...universStats].sort((a, b) => b.caHT - a.caHT)[0];
  
  const techMap = buildTechMap(data.users || []);
  const nbTechsActifs = Object.keys(techMap).length;
  const caMoyenParTech = nbTechsActifs > 0 ? currentMonthCA / nbTechsActifs : 0;
  
  const topApporteurs = calculateTop10Apporteurs(
    data.factures || [],
    data.projects || [],
    data.devis || [],
    data.clients || [],
    yearRange
  );
  const topApporteur = topApporteurs[0];
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentMonthIndex + 1, 0).getDate();
  const currentDay = currentDate.getMonth() === new Date().getMonth() ? new Date().getDate() : daysInMonth;
  const moyenneParJour = currentDay > 0 ? currentMonthCA / currentDay : 0;
  
  const savStats = calculateSAVGlobalStats(
    data.projects || [],
    data.factures || [],
    data.interventions || [],
    dateRange
  );
  
  const ecartObjectif = currentMonthCA - settings.objectif_amount;
  
  const monthNames = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  const tiles = [
    {
      title: 'CA Moyen / Technicien',
      value: formatEuros(caMoyenParTech),
      subtitle: `${nbTechsActifs} techniciens`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Top Métier',
      value: formatUniverseLabel(topUnivers?.univers || ''),
      subtitle: `${formatEuros(topUnivers?.caHT || 0)}`,
      icon: Star,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Taux de conversion',
      value: formatPercent(dashboardStats.tauxTransformationDevis || 0),
      subtitle: `Devis du mois`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Moyenne par jour',
      value: formatEuros(moyenneParJour),
      subtitle: `Sur ${currentDay} jours`,
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'Top Apporteur',
      value: topApporteur?.name || 'N/A',
      subtitle: formatEuros(topApporteur?.caHT || 0),
      icon: Star,
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'CA du mois',
      value: formatEuros(currentMonthCA),
      subtitle: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: settings.objectif_title,
      value: ecartObjectif >= 0 ? '+' + formatEuros(ecartObjectif) : formatEuros(ecartObjectif),
      subtitle: ecartObjectif >= 0 ? 'Objectif dépassé !' : `${formatEuros(Math.abs(ecartObjectif))} restants`,
      icon: Target,
      color: ecartObjectif >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600',
    },
    {
      title: 'SAV - Mois courant',
      value: `${savStats.nbSAVProjects}/${savStats.nbTotalProjects}`,
      subtitle: formatPercent(savStats.tauxSAV) + ' des dossiers',
      icon: AlertCircle,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {tiles.map((tile, idx) => (
        <Card
          key={idx}
          className="relative overflow-hidden p-6 border-2 border-border/50 shadow-xl hover:shadow-2xl transition-all"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${tile.color} opacity-10`} />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {tile.title}
              </h3>
              <tile.icon className="h-6 w-6 text-primary/60" />
            </div>
            <p className="text-3xl font-bold text-foreground">{tile.value}</p>
            <p className="text-xs text-muted-foreground">{tile.subtitle}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
