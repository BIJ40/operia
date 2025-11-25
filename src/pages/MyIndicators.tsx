import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyKpis } from '@/hooks/use-metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Euro, Percent, FolderOpen, Calendar, AlertTriangle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { KpiTile } from '@/components/dashboard/KpiTile';

export default function MyIndicators() {
  const { isAuthenticated, user, hasAccessToScope } = useAuth();
  const [period, setPeriod] = useState<'day' | 'yesterday' | 'week' | 'month' | 'year' | 'rolling12'>('month');
  const { data, isLoading, isError, error, refetch } = useAgencyKpis({ period });

  useEffect(() => {
    if (isAuthenticated && user) {
      refetch();
    }
  }, [isAuthenticated, user, period, refetch]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccessToScope('mes_indicateurs')) {
    return <Navigate to="/" replace />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getPeriodLabel = (p: string) => {
    const labels = {
      day: 'Aujourd\'hui',
      yesterday: 'Hier',
      week: 'Semaine en cours',
      month: 'Mois en cours',
      year: 'Année en cours',
      rolling12: '12 mois glissants'
    };
    return labels[p as keyof typeof labels] || p;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête avec sélecteur de période */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Mes indicateurs
          </h1>
          {data && (
            <p className="text-muted-foreground mt-2">
              Agence {data.agency.label} - {getPeriodLabel(period)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || 'Une erreur est survenue lors du chargement des indicateurs'}
          </AlertDescription>
        </Alert>
      )}

      {/* Bandeau de 12 tuiles de pilotage - 6 colonnes x 2 lignes */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* T1 - CA HT période (sélecteur) */}
        <KpiTile
          title="CA HT Période"
          value={data ? formatCurrency(data.kpis.ca_period) : '-'}
          subtitle={getPeriodLabel(period)}
          icon={Euro}
          isLoading={isLoading}
        />

        {/* T2 - CA HT J-1 */}
        <KpiTile
          title="CA HT J-1"
          value={data ? formatCurrency(data.kpis.ca_yesterday) : '-'}
          subtitle="Hier"
          icon={Euro}
          isLoading={isLoading}
        />

        {/* T3 - CA HT semaine en cours */}
        <KpiTile
          title="CA HT Semaine"
          value={data ? formatCurrency(data.kpis.ca_week) : '-'}
          subtitle="Semaine en cours"
          icon={Euro}
          isLoading={isLoading}
        />

        {/* T4 - CA HT mois en cours */}
        <KpiTile
          title="CA HT Mois"
          value={data ? formatCurrency(data.kpis.ca_month) : '-'}
          subtitle="Mois en cours"
          icon={Euro}
          isLoading={isLoading}
        />

        {/* T5 - CA HT année en cours */}
        <KpiTile
          title="CA HT Année"
          value={data ? formatCurrency(data.kpis.ca_year) : '-'}
          subtitle="Année en cours"
          icon={TrendingUp}
          isLoading={isLoading}
        />

        {/* T6 - CA HT 12 mois glissants */}
        <KpiTile
          title="CA HT 12 Glissants"
          value={data ? formatCurrency(data.kpis.ca_rolling12) : '-'}
          subtitle="12 derniers mois"
          icon={TrendingUp}
          isLoading={isLoading}
        />

        {/* T7 - Nombre de factures (période active) */}
        <KpiTile
          title="Factures"
          value={data ? data.kpis.invoices_count : '-'}
          subtitle={`Période: ${getPeriodLabel(period)}`}
          icon={Euro}
          isLoading={isLoading}
        />

        {/* T8 - Panier moyen facture (période active) */}
        <KpiTile
          title="Panier Moyen"
          value={data ? formatCurrency(data.kpis.avg_invoice) : '-'}
          subtitle={`Période: ${getPeriodLabel(period)}`}
          icon={Euro}
          isLoading={isLoading}
        />

        {/* T9 - Taux de CA apporteurs (%) */}
        <KpiTile
          title="Taux Apporteurs"
          value={data ? `${data.kpis.apporteurs_rate.toFixed(1)}%` : '-'}
          subtitle="Part du CA apporteurs"
          icon={Percent}
          isLoading={isLoading}
        />

        {/* T10 - Nombre de projets en cours */}
        <KpiTile
          title="Projets en Cours"
          value={data ? data.kpis.projects_in_progress : '-'}
          subtitle="Dossiers actifs"
          icon={FolderOpen}
          isLoading={isLoading}
        />

        {/* T11 - Interventions planifiées aujourd'hui */}
        <KpiTile
          title="Interventions Aujourd'hui"
          value={data ? data.kpis.interventions_today : '-'}
          subtitle="Créneaux planifiés"
          icon={Calendar}
          isLoading={isLoading}
        />

        {/* T12 - Taux de SAV (en CA) sur la période active */}
        <KpiTile
          title="Taux SAV"
          value={data ? `${data.kpis.sav_rate.toFixed(1)}%` : '-'}
          subtitle={`CA SAV / Période: ${getPeriodLabel(period)}`}
          icon={AlertTriangle}
          isLoading={isLoading}
        />
      </div>

      {/* Sections à venir : Graphiques, CA par univers, Apporteurs, Techniciens */}
      {!isLoading && data && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Placeholder pour graphiques */}
          <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Graphiques</CardTitle>
              <CardDescription>Évolutions et répartitions - À venir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Graphiques en développement
              </div>
            </CardContent>
          </Card>

          {/* Placeholder pour apporteurs */}
          <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Apporteurs</CardTitle>
              <CardDescription>Top apporteurs - À venir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Section apporteurs en développement
              </div>
            </CardContent>
          </Card>

          {/* Placeholder pour techniciens */}
          <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Techniciens</CardTitle>
              <CardDescription>Performance techniciens - À venir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Section techniciens en développement
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !data && !isError && (
        <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
          <CardContent className="pt-6 pb-6">
            <p className="text-center text-muted-foreground">
              Aucune donnée disponible. Veuillez contacter l'administrateur pour configurer votre agence.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
