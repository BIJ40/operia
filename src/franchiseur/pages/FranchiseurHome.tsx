import { TrendingUp, Building2, FileText, Wrench, AlertCircle, Euro } from "lucide-react";
import { NetworkPeriodSelector } from "../components/filters/NetworkPeriodSelector";
import { AgencySelector } from "../components/filters/AgencySelector";
import { NetworkKpiTile } from "../components/widgets/NetworkKpiTile";
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NetworkKpiTile
          title="CA Année en cours"
          value={stats?.totalCA || 0}
          icon={TrendingUp}
          format="currency"
        />

        <NetworkKpiTile
          title="CA Période"
          value={stats?.totalCA || 0}
          icon={TrendingUp}
          format="currency"
          subtitle={`Du ${dateRange.from.toLocaleDateString('fr-FR')} au ${dateRange.to.toLocaleDateString('fr-FR')}`}
        />

        {permissions.canViewRoyalties && (
          <NetworkKpiTile
            title="Redevances Mois"
            value={0}
            icon={Euro}
            format="currency"
          />
        )}

        <NetworkKpiTile
          title="Agences Actives"
          value={stats?.agencyCount || 0}
          icon={Building2}
        />

        <NetworkKpiTile
          title="Dossiers Totaux"
          value={stats?.totalProjects || 0}
          icon={FileText}
        />

        <NetworkKpiTile
          title="Interventions"
          value={0}
          icon={Wrench}
        />

        <NetworkKpiTile
          title="Taux SAV"
          value={0}
          icon={AlertCircle}
          format="percentage"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            TOP 5 Agences (CA)
          </h3>
          <p className="text-sm text-muted-foreground">
            Classement des meilleures agences par chiffre d'affaires
          </p>
        </div>

        <div className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Meilleur Apporteur
          </h3>
          <p className="text-sm text-muted-foreground">
            Top performer en CA et nombre de dossiers
          </p>
        </div>
      </div>
    </div>
  );
}
