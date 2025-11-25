import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyKpis } from '@/hooks/use-metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, FileText, Wrench, Euro, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function MyIndicators() {
  const { isAuthenticated, user, hasAccessToScope } = useAuth();
  const { data, isLoading, isError, error, refetch } = useAgencyKpis({ period: 'month' });

  useEffect(() => {
    if (isAuthenticated && user) {
      refetch();
    }
  }, [isAuthenticated, user, refetch]);

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Mes indicateurs
          </h1>
          {data && (
            <p className="text-muted-foreground mt-2">
              Agence {data.agency.label} - {data.period.type === 'month' ? 'Mois en cours' : 'Année en cours'}
            </p>
          )}
        </div>
        <Button 
          onClick={refetch} 
          disabled={isLoading}
          className="bg-gradient-to-r from-primary to-helpconfort-blue-dark hover:from-primary/90 hover:to-helpconfort-blue-dark/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || 'Une erreur est survenue lors du chargement des indicateurs'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* CA du mois */}
        <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">CA du mois</CardTitle>
            <div className="p-2 rounded-full bg-accent/20">
              <Euro className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                  {data ? formatCurrency(data.kpis.ca_month) : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Chiffre d'affaires du mois en cours
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* CA de l'année */}
        <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">CA de l'année</CardTitle>
            <div className="p-2 rounded-full bg-accent/20">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                  {data ? formatCurrency(data.kpis.ca_year) : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Chiffre d'affaires cumulé de l'année
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Nombre de factures */}
        <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Factures du mois</CardTitle>
            <div className="p-2 rounded-full bg-accent/20">
              <FileText className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                  {data ? data.kpis.invoices_count_month : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Nombre de factures émises ce mois
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Nombre d'interventions */}
        <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Interventions du mois</CardTitle>
            <div className="p-2 rounded-full bg-accent/20">
              <Wrench className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                  {data ? data.kpis.interventions_count_month : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Nombre d'interventions réalisées
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
