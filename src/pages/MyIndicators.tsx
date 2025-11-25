import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyKpis } from '@/hooks/use-metrics';
import { Navigate } from 'react-router-dom';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { KpiTile } from '@/components/dashboard/KpiTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Euro, FileText, ShoppingCart, Users, Briefcase, Calendar, 
  Wrench, FileCheck, FolderOpen, Target, HardHat, AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ApporteursSection } from '@/components/sections/ApporteursSection';

export default function MyIndicators() {
  const { isAuthenticated, hasAccessToScope } = useAuth();
  const [period, setPeriod] = useState<'day' | '7days' | 'month' | 'year' | 'rolling12'>('month');
  const { data, isLoading, isError, error } = useAgencyKpis({ period });

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
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPeriodLabel = (p: string) => {
    const labels = {
      day: 'Jour',
      '7days': '7 derniers jours',
      month: 'Mois en cours',
      year: 'Année en cours',
      rolling12: '12 mois glissants'
    };
    return labels[p as keyof typeof labels] || p;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* En-tête */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
              Mes Indicateurs
            </h1>
            {data?.agency && (
              <p className="text-muted-foreground mt-2">
                {data.agency.label} · {getPeriodLabel(period)}
              </p>
            )}
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* Alerte erreur */}
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message || 'Erreur lors du chargement des indicateurs'}
            </AlertDescription>
          </Alert>
        )}

        {/* Bandeau des 12 tuiles KPI */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Pilotage instantané</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {/* T1 - CA HT (temporel) */}
            <KpiTile
              title="CA HT"
              value={data ? formatCurrency(data.kpis.ca_period) : '-'}
              subtitle={getPeriodLabel(period)}
              icon={Euro}
              isLoading={isLoading}
            />

            {/* T2 - Factures (temporel) */}
            <KpiTile
              title="Factures"
              value={data ? data.kpis.invoices_count : '-'}
              subtitle="Émises"
              icon={FileText}
              isLoading={isLoading}
            />

            {/* T3 - Panier Moyen (temporel) */}
            <KpiTile
              title="Panier Moyen"
              value={data ? formatCurrency(data.kpis.avg_invoice) : '-'}
              subtitle="Par facture"
              icon={ShoppingCart}
              isLoading={isLoading}
            />

            {/* T4 - Taux Apporteurs (temporel) */}
            <KpiTile
              title="Taux Apporteurs"
              value={data ? `${data.kpis.apporteurs_rate.toFixed(1)}%` : '-'}
              subtitle="Part du CA"
              icon={Users}
              isLoading={isLoading}
            />

            {/* T5 - Dossiers en Cours (structurel) */}
            <KpiTile
              title="Dossiers en Cours"
              value={data ? data.kpis.projects_in_progress : '-'}
              subtitle="⏱ Instantané"
              icon={Briefcase}
              isLoading={isLoading}
            />

            {/* T6 - Rendez-Vous (temporel) - réalisés sur la période */}
            <KpiTile
              title="Rendez-Vous"
              value={data ? data.kpis.interventions_count : '-'}
              subtitle="Réalisés sur la période"
              icon={Wrench}
              isLoading={isLoading}
              tooltip="Nombre de rendez-vous terminés sur la période sélectionnée"
            />

            {/* T7 - Rendez-Vous (temporel) */}
            <KpiTile
              title="Rendez-Vous"
              value={data ? data.kpis.interventions_count : '-'}
              subtitle="Réalisés"
              icon={Wrench}
              isLoading={isLoading}
            />

            {/* T8 - Devis (temporel) */}
            <KpiTile
              title="Devis"
              value={data ? data.kpis.devis_count : '-'}
              subtitle="Émis"
              icon={FileCheck}
              isLoading={isLoading}
            />

            {/* T9 - Dossiers (temporel) */}
            <KpiTile
              title="Dossiers"
              value={data ? data.kpis.projects_count : '-'}
              subtitle="Nouveaux"
              icon={FolderOpen}
              isLoading={isLoading}
            />

            {/* T10 - Taux Conversion (temporel) */}
            <KpiTile
              title="Taux Conversion"
              value={data ? `${data.kpis.conversion_rate.toFixed(1)}%` : '-'}
              subtitle="Devis envoyés → Acceptés"
              icon={Target}
              isLoading={isLoading}
              tooltip="Pourcentage de devis envoyés (hors brouillon) qui ont été acceptés ou commandés sur la période"
            />

            {/* T11 - Techniciens (structurel) */}
            <KpiTile
              title="Techniciens"
              value={data ? data.kpis.active_technicians : '-'}
              subtitle="⏱ Actifs"
              icon={HardHat}
              isLoading={isLoading}
            />

            {/* T12 - Taux SAV (temporel) */}
            <KpiTile
              title="Taux SAV"
              value={data ? `${data.kpis.sav_rate.toFixed(1)}%` : '-'}
              subtitle="Dossiers avec SAV"
              icon={AlertTriangle}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Bloc CA */}
        {!isLoading && data && (
          <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Chiffre d'affaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Courbe CA mensuel - À implémenter */}
                <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                  Courbe CA mensuel (12 derniers mois) - En développement
                </div>
                
                {/* CA par univers */}
                {data.details?.ca_by_universe && data.details.ca_by_universe.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">CA par univers</h3>
                    <div className="space-y-2">
                      {data.details.ca_by_universe.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-sm">{item.universe}</span>
                          <span className="text-sm font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bloc Apporteurs */}
        {!isLoading && data && (
          <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Apporteurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Top 10 apporteurs */}
                {data.details?.apporteurs && data.details.apporteurs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Top 10 Apporteurs</h3>
                    <div className="space-y-2">
                      {data.details.apporteurs.slice(0, 10).map((apporteur, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{apporteur.name}</div>
                            <div className="text-xs text-muted-foreground">{apporteur.type} · {apporteur.projects} dossier(s)</div>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(apporteur.ca)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CA par type d'apporteur */}
                {data.details?.ca_by_apporteur_type && data.details.ca_by_apporteur_type.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">CA par type d'apporteur</h3>
                    <div className="space-y-2">
                      {data.details.ca_by_apporteur_type.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-sm">{item.type}</span>
                          <span className="text-sm font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bloc Techniciens */}
        {!isLoading && data && (
          <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                Techniciens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* CA par technicien */}
                {data.details?.ca_by_technician && data.details.ca_by_technician.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">CA par technicien</h3>
                    <div className="space-y-2">
                      {data.details.ca_by_technician.map((tech, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{tech.name}</div>
                            <div className="text-xs text-muted-foreground">{tech.interventions} rendez-vous</div>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(tech.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance détaillée */}
                {data.details?.technicians && data.details.technicians.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Performance détaillée</h3>
                    <div className="space-y-3">
                      {data.details.technicians.map((tech, idx) => (
                        <div key={idx} className="p-3 bg-background/50 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{tech.name}</span>
                            <span className="text-sm font-semibold">{formatCurrency(tech.ca)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>{tech.interventions} rendez-vous · {tech.sav} SAV</div>
                            {tech.universes && tech.universes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {tech.universes.map((u, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-primary/10 rounded text-xs">
                                    {u.universe}: {formatCurrency(u.amount)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Apporteurs */}
        {!isLoading && data && (
          <ApporteursSection />
        )}

        {/* État de chargement */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* État vide */}
        {!isLoading && !data && !isError && (
          <Card className="border-2 border-primary/20 p-8">
            <CardContent className="text-center text-muted-foreground">
              Aucune donnée disponible. Veuillez contacter l'administrateur.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
