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

      {/* Ligne 1: KPIs temporels (liés au sélecteur de période) */}
      <div className="grid gap-4 md:grid-cols-2">
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
