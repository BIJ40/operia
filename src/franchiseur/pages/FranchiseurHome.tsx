import { TrendingUp, FileText, Wrench, AlertCircle, Euro, Clock, Zap, Timer, Calendar, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NetworkPeriodSelector } from "../components/filters/NetworkPeriodSelector";
import { AgencySelector } from "../components/filters/AgencySelector";
import { NetworkKpiTile } from "../components/widgets/NetworkKpiTile";
import { TopAgenciesWidget } from "../components/widgets/TopAgenciesWidget";
import { TopApporteurWidget } from "../components/widgets/TopApporteurWidget";
import { NetworkMonthlyCAChart } from "../components/widgets/NetworkMonthlyCAChart";
import { NetworkCAPieChart } from "../components/widgets/NetworkCAPieChart";
import { NetworkSAVChart } from "../components/widgets/NetworkSAVChart";
import { useNetworkStats } from "../hooks/useNetworkStats";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { useNetworkFilters } from "../contexts/NetworkFiltersContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function FranchiseurHome() {
  const { permissions } = useFranchiseur();
  const { dateRange } = useNetworkFilters();
  const { data: stats, isLoading } = useNetworkStats();
  const { canViewScope, isAdmin, isFranchiseur } = usePermissions();
  const navigate = useNavigate();

  // Guard: vérifier l'accès au dashboard franchiseur
  const canView = canViewScope('franchiseur_dashboard');
  
  useEffect(() => {
    if (!canView && !isAdmin && !isFranchiseur) {
      navigate('/');
    }
  }, [canView, isAdmin, isFranchiseur, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Tableau de bord Réseau
        </h1>
        <p className="text-muted-foreground mt-2">
          Vue d'ensemble des performances du réseau
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <AgencySelector />
        <NetworkPeriodSelector />
      </div>

      {/* Ligne 1: KPIs temporels (liés au sélecteur de période) */}
      <div className="grid gap-4 md:grid-cols-4">
        <NetworkKpiTile
          title="CA Année en cours"
          value={stats?.totalCAYear || 0}
          icon={TrendingUp}
          format="currency"
        />

        <NetworkKpiTile
          title="CA Période"
          value={stats?.totalCAPeriod || 0}
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
          value={stats?.totalProjectsPeriod || 0}
          icon={FileText}
        />

        <NetworkKpiTile
          title="Interventions"
          value={stats?.totalInterventions || 0}
          icon={Wrench}
        />
      </div>

      {/* Ligne 2: 6 KPIs intemporels (NON liés au sélecteur de période) */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {permissions.canViewRoyalties && (
          <NetworkKpiTile
            title="Redevances Mois"
            value={stats?.monthlyRoyalties || 0}
            icon={Euro}
            format="currency"
          />
        )}

        <NetworkKpiTile
          title="Délai moyen traitement"
          value={stats?.averageProcessingTime || 0}
          icon={Clock}
          subtitle="jours"
        />

        <NetworkKpiTile
          title="Taux One-Shot"
          value={stats?.oneShotRate || 0}
          icon={Zap}
          format="percentage"
          subtitle="1 seule intervention"
        />

        <NetworkKpiTile
          title="Délai Dossier > Devis"
          value={stats?.projectToQuoteDelay || 0}
          icon={Timer}
          subtitle="jours en moyenne"
        />

        <NetworkKpiTile
          title="Visites/RDV"
          value={stats?.visitsPerProject || 0}
          icon={Calendar}
          subtitle="par dossier"
        />

        <NetworkKpiTile
          title="Multi Univers"
          value={stats?.multiUniversRate || 0}
          icon={Network}
          format="percentage"
          subtitle="plusieurs univers"
        />
      </div>

      {/* Ligne 3: SAV (intemporel) */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Taux SAV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Global Réseau</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                {stats?.savRateGlobal?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.nbTotalSAVProjects || 0} SAV / {stats?.totalProjects || 0} dossiers
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Moyenne Agences</p>
              <p className="text-lg font-semibold text-helpconfort-blue-dark">
                {stats?.savRateMoyenne?.toFixed(1) || 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NetworkMonthlyCAChart data={stats?.monthlyCAEvolution || []} />
        <NetworkCAPieChart data={stats?.caByAgency || []} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NetworkSAVChart data={stats?.monthlySAVEvolution || []} />
        <div className="grid gap-4 md:grid-cols-2">
          <TopAgenciesWidget agencies={stats?.top5Agencies || []} />
          <TopApporteurWidget apporteur={stats?.bestApporteur || null} />
        </div>
      </div>
    </div>
  );
}
