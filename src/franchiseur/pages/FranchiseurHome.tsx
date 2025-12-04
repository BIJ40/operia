import { TrendingUp, FileText, Wrench, AlertCircle, Euro, Clock, Zap, Timer, Calendar, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkPeriodSelector } from "../components/filters/NetworkPeriodSelector";
import { AgencySelector } from "../components/filters/AgencySelector";
import { NetworkKpiTile } from "../components/widgets/NetworkKpiTile";
import { TopAgenciesWidget } from "../components/widgets/TopAgenciesWidget";
import { TopApporteurWidget } from "../components/widgets/TopApporteurWidget";
import { NetworkMonthlyCAChart } from "../components/widgets/NetworkMonthlyCAChart";
import { NetworkCAPieChart } from "../components/widgets/NetworkCAPieChart";
import { NetworkSAVChart } from "../components/widgets/NetworkSAVChart";
import { useStatiaReseauDashboard } from "@/statia/hooks/useStatiaReseauDashboard";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { useNetworkFilters } from "../contexts/NetworkFiltersContext";

function SkeletonKpiTile() {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

export default function FranchiseurHome() {
  const { permissions } = useFranchiseur();
  const { dateRange } = useNetworkFilters();
  
  // Nouveau hook StatIA unifié
  const { data, isLoading } = useStatiaReseauDashboard();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonKpiTile key={i} />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => <SkeletonKpiTile key={i} />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  // Extraction des données StatIA
  const { tuilesHautes, blocSav, blocCA, blocApporteurs } = data;

  // Conversion pour les widgets existants
  const monthlyCAEvolution = blocCA.serieCAMensuel.map(item => ({
    month: item.month,
    ca: item.ca,
    nbFactures: 0, // Non utilisé dans le graphique
  }));

  const caByAgency = blocCA.partCAParAgence.map(item => ({
    agencyLabel: item.agencyLabel,
    ca: item.ca,
  }));

  const monthlySAVEvolution = blocSav.serieTauxSavMensuel.map(item => ({
    month: item.month,
    tauxSAV: item.tauxSAV,
  }));

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <AgencySelector />
        <NetworkPeriodSelector />
      </div>

      {/* Ligne 1: KPIs temporels (liés au sélecteur de période) */}
      <div className="grid gap-4 md:grid-cols-4">
        <NetworkKpiTile
          title="CA Année en cours"
          value={tuilesHautes.caAnneeEnCours}
          icon={TrendingUp}
          format="currency"
        />

        <NetworkKpiTile
          title="CA Période"
          value={tuilesHautes.caPeriode}
          icon={TrendingUp}
          format="currency"
          subtitle={
            dateRange
              ? `Du ${dateRange.from.toLocaleDateString('fr-FR')} au ${dateRange.to.toLocaleDateString('fr-FR')}`
              : undefined
          }
        />

        <NetworkKpiTile
          title="Dossiers Période"
          value={tuilesHautes.dossiersPeriode}
          icon={FileText}
        />

        <NetworkKpiTile
          title="Interventions"
          value={tuilesHautes.interventionsPeriode}
          icon={Wrench}
        />
      </div>

      {/* Ligne 2: 6 KPIs intemporels (NON liés au sélecteur de période) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {permissions.canViewRoyalties && (
          <NetworkKpiTile
            title="Redevances Mois"
            value={tuilesHautes.redevancesMois}
            icon={Euro}
            format="currency"
          />
        )}

        <NetworkKpiTile
          title="Délai moyen traitement"
          value={tuilesHautes.delaiMoyenTraitement}
          icon={Clock}
          subtitle="jours"
        />

        <NetworkKpiTile
          title="Taux One-Shot"
          value={tuilesHautes.tauxOneShot}
          icon={Zap}
          format="percentage"
          subtitle="1 seule intervention"
        />

        <NetworkKpiTile
          title="Délai Dossier > Devis"
          value={tuilesHautes.delaiDossierDevis}
          icon={Timer}
          subtitle="jours en moyenne"
        />

        <NetworkKpiTile
          title="Visites/RDV"
          value={tuilesHautes.visitesParDossier}
          icon={Calendar}
          subtitle="par dossier"
        />

        <NetworkKpiTile
          title="Multi Univers"
          value={tuilesHautes.tauxMultiUnivers}
          icon={Network}
          format="percentage"
          subtitle="plusieurs univers"
        />
      </div>

      {/* Ligne 3: SAV (intemporel) */}
      <div className="grid gap-4 md:grid-cols-1">
        <div className="group relative rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
          shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
          hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-helpconfort-blue" />
            <span className="text-sm font-medium text-muted-foreground">Taux SAV</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Global Réseau</p>
              <p className="text-2xl font-bold text-foreground">
                {blocSav.tauxSavGlobalReseau.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {blocSav.nbSavGlobal} SAV / {blocSav.nbDossiersBaseSav} dossiers
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Moyenne Agences</p>
              <p className="text-lg font-semibold text-helpconfort-blue">
                {blocSav.tauxSavMoyenAgences.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NetworkMonthlyCAChart data={monthlyCAEvolution} />
        <NetworkCAPieChart data={caByAgency} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NetworkSAVChart data={monthlySAVEvolution} />
        <div className="grid gap-4 md:grid-cols-2">
          <TopAgenciesWidget agencies={blocCA.top5AgencesCA} />
          <TopApporteurWidget apporteurs={blocApporteurs.top3ApporteursCA} />
        </div>
      </div>
    </div>
  );
}
