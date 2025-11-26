import { TrendingUp, FileText, Wrench, AlertCircle, Euro, Clock } from "lucide-react";
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

export default function FranchiseurHome() {
  const { permissions } = useFranchiseur();
  const { dateRange } = useNetworkFilters();
  const { data: stats, isLoading } = useNetworkStats();

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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
          title="Dossiers Totaux"
          value={stats?.totalProjects || 0}
          icon={FileText}
        />

        <NetworkKpiTile
          title="Interventions"
          value={stats?.totalInterventions || 0}
          icon={Wrench}
        />

        <NetworkKpiTile
          title="Taux SAV"
          value={stats?.savRate || 0}
          icon={AlertCircle}
          format="percentage"
        />

        <NetworkKpiTile
          title="Délai moyen traitement"
          value={stats?.averageProcessingTime || 0}
          icon={Clock}
          subtitle="jours par dossier/intervention"
        />

        {permissions.canViewRoyalties && (
          <NetworkKpiTile
            title="Redevances Mois"
            value={stats?.monthlyRoyalties || 0}
            icon={Euro}
            format="currency"
          />
        )}
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
