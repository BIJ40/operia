import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { logWarn } from "@/lib/logger";
import { FolderOpen, Euro, Percent, ShoppingCart, Clock, Users, TrendingUp, Heart, ArrowUpRight } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { 
  calculateDossiersConfiesParApporteur, 
  ApporteurStats,
  FlopApporteurStats,
} from "@/apogee-connect/utils/apporteursCalculations";
import { TopApporteursWidget } from "@/apogee-connect/components/widgets/TopApporteursWidget";
import { DossiersConfiesWidget } from "@/apogee-connect/components/widgets/DossiersConfiesWidget";
import { FlopApporteursWidget } from "@/apogee-connect/components/widgets/FlopApporteursWidget";
import { TypesApporteursWidget } from "@/apogee-connect/components/widgets/TypesApporteursWidget";

import { SegmentationChart } from "@/apogee-connect/components/widgets/SegmentationChart";
import { ApporteurTypeTimeline } from "@/apogee-connect/components/widgets/ApporteurTypeTimeline";
import { useApporteursStatia } from "@/statia/hooks/useApporteursStatia";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutKpiChart, RingProgressKpi } from "../charts";

export function ApporteursTab() {
  const { filters: secondaryFilters } = useSecondaryFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();

  const { data: statiaKpis, isLoading: isStatiaLoading } = useApporteursStatia();

  const { data: widgetsData, isLoading: isWidgetsLoading } = useQuery({
    queryKey: ["apporteurs-widgets-hub", secondaryFilters, isApiEnabled, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) {
        logWarn('STATSHUB_APPORTEURS', 'Agence non définie');
        return null;
      }
      const apiData = await DataService.loadAllData(isApiEnabled, false, currentAgency?.id);
      const dossiersConfiesParApporteur = calculateDossiersConfiesParApporteur(
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      return {
        dossiersConfiesParApporteur,
        rawProjects: apiData.projects || [],
        rawClients: apiData.clients || [],
      };
    },
  });

  const topApporteursForWidget = useMemo((): ApporteurStats[] => {
    if (!statiaKpis?.topApporteurs?.length) return [];
    return statiaKpis.topApporteurs.map((item, idx) => ({
      apporteurId: idx + 1,
      name: item.name,
      caHT: item.ca,
      nbDossiers: statiaKpis.dossiersParApporteur[item.name] || 0,
      nbDevis: 0,
      tauxTransformation: statiaKpis.tauxTransfoParApporteur[item.name] || 0,
    }));
  }, [statiaKpis]);

  const flopApporteursForWidget = useMemo((): FlopApporteurStats[] => {
    if (!statiaKpis?.topEncours?.length) return [];
    return statiaKpis.topEncours.map((item, idx) => ({
      apporteurId: idx + 1,
      name: item.name,
      duTotal: item.encours,
      nbFacturesImpayees: item.nbFactures || 0,
    }));
  }, [statiaKpis]);

  const typesApporteursStats = useMemo(() => {
    if (!statiaKpis?.statsByType?.length) return [];
    return statiaKpis.statsByType.map(s => ({
      type: s.type,
      caHT: s.caHT,
      nbDossiers: s.nbDossiers,
      nbFactures: s.nbDossiers,
      panierMoyen: s.panierMoyen,
      tauxTransformation: s.tauxTransfo,
      tauxSAV: s.tauxSav,
    }));
  }, [statiaKpis]);

  const segmentationData = useMemo(() => {
    if (!statiaKpis?.segmentationMensuelle?.length) return [];
    return statiaKpis.segmentationMensuelle.map(m => ({
      month: m.mois,
      mois: m.mois,
      caParticuliers: m.particuliers,
      caApporteurs: m.apporteurs,
      totalCA: m.particuliers + m.apporteurs,
      percentParticuliers: (m.particuliers + m.apporteurs) > 0 ? (m.particuliers / (m.particuliers + m.apporteurs)) * 100 : 0,
      percentApporteurs: (m.particuliers + m.apporteurs) > 0 ? (m.apporteurs / (m.particuliers + m.apporteurs)) * 100 : 0,
      partParticuliers: (m.particuliers + m.apporteurs) > 0 ? (m.particuliers / (m.particuliers + m.apporteurs)) * 100 : 0,
      partApporteurs: (m.particuliers + m.apporteurs) > 0 ? (m.apporteurs / (m.particuliers + m.apporteurs)) * 100 : 0,
      apporteurs: m.apporteurs,
      particuliers: m.particuliers,
    }));
  }, [statiaKpis]);


  const isLoading = isStatiaLoading || isWidgetsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section visuelle avec donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Donut CA par Top Apporteurs */}
        <Card className="p-4">
          <CardHeader className="pb-2 px-0 pt-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Répartition CA Top Apporteurs</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <DonutKpiChart
              segments={topApporteursForWidget.slice(0, 5).map((a, i) => ({
                label: a.name,
                value: a.caHT,
                color: ['hsl(220, 70%, 50%)', 'hsl(142, 70%, 45%)', 'hsl(280, 70%, 50%)', 'hsl(35, 90%, 55%)', 'hsl(340, 70%, 50%)'][i],
              }))}
              centerLabel="CA HT"
              size={140}
            />
          </CardContent>
        </Card>

        {/* Ring progress Dû Global */}
        <Card className="p-4 flex items-center justify-center">
          <RingProgressKpi
            value={statiaKpis?.duGlobal || 0}
            maxValue={statiaKpis?.caTotal || 100000}
            label="Dû global"
            subtitle="TTC à encaisser"
            color="hsl(35, 90%, 55%)"
            size={140}
            formatValue={(v) => formatEuros(v)}
          />
        </Card>

        {/* Ring progress Taux Transfo */}
        <Card className="p-4 flex items-center justify-center">
          <RingProgressKpi
            value={statiaKpis?.tauxTransformationMoyen || 0}
            maxValue={100}
            label="Taux transfo"
            subtitle="Devis → Factures"
            color="hsl(280, 70%, 50%)"
            size={140}
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
        </Card>
      </div>

      {/* 5 KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiTile icon={Euro} title="Dû global TTC" value={formatEuros(statiaKpis?.duGlobal || 0)} color="orange" subtitle="à encaisser" />
        <KpiTile icon={FolderOpen} title="Dossiers confiés" value={statiaKpis?.dossiersConfiesTotal || 0} color="blue" subtitle="total période" />
        <KpiTile icon={Percent} title="Taux transfo moyen" value={`${(statiaKpis?.tauxTransformationMoyen || 0).toFixed(0)}%`} color="purple" subtitle="Devis → Factures" />
        <KpiTile icon={ShoppingCart} title="Panier moyen HT" value={formatEuros(statiaKpis?.panierMoyenHT || 0)} color="green" subtitle="par dossier" />
        <KpiTile icon={Clock} title="Délai moyen" value={`${Math.round(statiaKpis?.delaiMoyenFacturation || 0)} j`} color="indigo" subtitle="Dossier → Facture" />
      </div>

      {/* 5 KPIs secondaires */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiTile icon={Users} title="Apporteurs actifs" value={statiaKpis?.apporteursActifs || 0} color="cyan" subtitle="sur période" />
        <KpiTile icon={TrendingUp} title="CA moyen / Apporteur" value={formatEuros(statiaKpis?.caMoyenParApporteur || 0)} color="pink" subtitle="moyenne HT" />
        <KpiTile icon={Clock} title="Délai paiement" value={`${statiaKpis?.delaiMoyenPaiement || 0} j`} color="amber" subtitle="moyen" />
        <KpiTile icon={Heart} title="Taux fidélité" value={statiaKpis?.hasDataN1 ? `${statiaKpis?.tauxFidelite || 0}%` : "N-1 indispo"} color="emerald" subtitle="récurrents" />
        <KpiTile icon={ArrowUpRight} title="Croissance CA" value={statiaKpis?.hasDataN1 ? `${(statiaKpis?.croissanceCA || 0) >= 0 ? '+' : ''}${statiaKpis?.croissanceCA || 0}%` : "N-1 indispo"} color="violet" subtitle="vs N-1" />
      </div>

      {/* Widgets TOP/FLOP + Dossiers confiés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopApporteursWidget data={topApporteursForWidget} />
        <FlopApporteursWidget data={flopApporteursForWidget} />
        <DossiersConfiesWidget dossiers={widgetsData?.dossiersConfiesParApporteur || []} />
      </div>

      {/* Types d'apporteurs */}
      <TypesApporteursWidget data={typesApporteursStats} />

      {/* Graphique segmentation */}
      <SegmentationChart data={segmentationData} />

      {/* Timeline par type */}
      <ApporteurTypeTimeline 
        projects={widgetsData?.rawProjects || []} 
        clients={widgetsData?.rawClients || []} 
      />
    </div>
  );
}

// Composant KpiTile simplifié
function KpiTile({ icon: Icon, title, value, color, subtitle }: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string; 
  value: string | number; 
  color: string;
  subtitle: string;
}) {
  const colors: Record<string, string> = {
    orange: 'border-l-orange-500 from-orange-500/10 text-orange-500',
    blue: 'border-l-blue-500 from-blue-500/10 text-blue-500',
    purple: 'border-l-purple-500 from-purple-500/10 text-purple-500',
    green: 'border-l-green-500 from-green-500/10 text-green-500',
    indigo: 'border-l-indigo-500 from-indigo-500/10 text-indigo-500',
    cyan: 'border-l-cyan-500 from-cyan-500/10 text-cyan-500',
    pink: 'border-l-pink-500 from-pink-500/10 text-pink-500',
    amber: 'border-l-amber-500 from-amber-500/10 text-amber-500',
    emerald: 'border-l-emerald-500 from-emerald-500/10 text-emerald-500',
    violet: 'border-l-violet-500 from-violet-500/10 text-violet-500',
  };
  const colorClass = colors[color] || colors.blue;
  const [borderClass, bgClass, textClass] = colorClass.split(' ');

  return (
    <div className={`rounded-xl border p-4 border-l-4 ${borderClass} bg-gradient-to-br ${bgClass} to-background shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass.replace('from-', 'bg-')}`}>
          <Icon className={`w-4 h-4 ${textClass}`} />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
