import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyKpis } from '@/hooks/use-metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, FileText, Wrench, Euro, RefreshCw } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

export default function MyIndicators() {
  const { isAuthenticated, user, hasAccessToScope } = useAuth();
  const { data, isLoading, isError, error, refetch } = useAgencyKpis({ period: 'month' });
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      refetch();
    }
  }, [isAuthenticated, user, refetch]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Vérification des permissions d'accès au scope 'indicateurs'
  const hasAccess = hasAccessToScope('indicateurs');

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder aux indicateurs.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes indicateurs</h1>
          {data && (
            <p className="text-muted-foreground mt-1">
              Agence {data.agency.label} - {data.period.type === 'month' ? 'Mois en cours' : 'Année en cours'}
            </p>
          )}
        </div>
        <Button onClick={refetch} disabled={isLoading} variant="outline">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA du mois</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? formatCurrency(data.kpis.ca_month) : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Chiffre d'affaires du mois en cours
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* CA de l'année */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA de l'année</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? formatCurrency(data.kpis.ca_year) : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Chiffre d'affaires cumulé de l'année
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Nombre de factures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures du mois</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? data.kpis.invoices_count_month : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nombre de factures émises ce mois
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Nombre d'interventions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions du mois</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data ? data.kpis.interventions_count_month : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nombre d'interventions réalisées
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!isLoading && !data && !isError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucune donnée disponible. Veuillez contacter l'administrateur pour configurer votre agence.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
