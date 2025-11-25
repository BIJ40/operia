import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyKpis } from '@/hooks/use-metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, FileText, Wrench, Euro, RefreshCw, BarChart3, Target, Users, AlertCircle, Package } from 'lucide-react';
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

      {/* Bandeau de 12 tuiles de pilotage */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* CA Période */}
        <KpiTile
          title="CA Période"
          value={data ? formatCurrency(data.kpis.ca_period) : '-'}
          subtitle="Chiffre d'affaires de la période"
          icon={Euro}
          isLoading={isLoading}
        />

        {/* CA Année */}
        <KpiTile
          title="CA Année"
          value={data ? formatCurrency(data.kpis.ca_year) : '-'}
          subtitle="Chiffre d'affaires annuel cumulé"
          icon={TrendingUp}
          isLoading={isLoading}
        />

        {/* Factures */}
        <KpiTile
          title="Factures"
          value={data ? data.kpis.invoices_count : '-'}
          subtitle="Nombre de factures émises"
          icon={FileText}
          isLoading={isLoading}
        />

        {/* Interventions */}
        <KpiTile
          title="Interventions"
          value={data ? data.kpis.interventions_count : '-'}
          subtitle="Nombre d'interventions réalisées"
          icon={Wrench}
          isLoading={isLoading}
        />

        {/* Devis */}
        <KpiTile
          title="Devis"
          value={data ? data.kpis.devis_count : '-'}
          subtitle="Nombre de devis émis"
          icon={Package}
          isLoading={isLoading}
        />

        {/* Projets */}
        <KpiTile
          title="Projets"
          value={data ? data.kpis.projects_count : '-'}
          subtitle="Nombre de nouveaux projets"
          icon={BarChart3}
          isLoading={isLoading}
        />

        {/* Facture moyenne */}
        <KpiTile
          title="Facture Moyenne"
          value={data ? formatCurrency(data.kpis.avg_invoice) : '-'}
          subtitle="Montant moyen par facture"
          icon={Target}
          isLoading={isLoading}
        />

        {/* Projet moyen */}
        <KpiTile
          title="Projet Moyen"
          value={data ? formatCurrency(data.kpis.avg_project) : '-'}
          subtitle="CA moyen par projet"
          icon={Target}
          isLoading={isLoading}
        />

        {/* Taux de conversion */}
        <KpiTile
          title="Taux de Conversion"
          value={data ? `${data.kpis.conversion_rate}%` : '-'}
          subtitle="Devis transformés en factures"
          icon={TrendingUp}
          isLoading={isLoading}
        />

        {/* SAV */}
        <KpiTile
          title="Interventions SAV"
          value={data ? data.kpis.sav_count : '-'}
          subtitle={`${data?.kpis.sav_percentage || 0}% des interventions`}
          icon={AlertCircle}
          isLoading={isLoading}
        />

        {/* Techniciens actifs */}
        <KpiTile
          title="Techniciens Actifs"
          value={data ? data.kpis.active_technicians : '-'}
          subtitle="Techniciens ayant intervenu"
          icon={Users}
          isLoading={isLoading}
        />

        {/* Placeholder 12ème tuile - à définir */}
        <KpiTile
          title="Indicateur personnalisé"
          value={'-'}
          subtitle="À définir"
          icon={BarChart3}
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
